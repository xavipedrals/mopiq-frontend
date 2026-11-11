#!/usr/bin/env python3
"""Download public examples; build clearly marked synthetic 300-slide stress files.
No uploads, credentials, production data, or backend calls. Copyright stays with authors.
"""
import argparse,copy,hashlib,json,posixpath,urllib.request,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SAMPLES=ROOT/'samples'
P='http://schemas.openxmlformats.org/presentationml/2006/main'
A='http://schemas.openxmlformats.org/drawingml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG='http://schemas.openxmlformats.org/package/2006/relationships'
CT='http://schemas.openxmlformats.org/package/2006/content-types'
ORIGINALS=[
 {'id':'kurose-transport','name':'Kurose & Ross · Transport Layer','file':'kurose-Chapter_3_v9.0.pptx','sourceUrl':'https://gaia.cs.umass.edu/kurose_ross/ppt-9e/Chapter_3_v9.0.pptx'},
 {'id':'stanford-javascript-basics','name':'Stanford · JavaScript Basics','file':'stanford-javascript-basics.pptx','sourceUrl':'https://web.stanford.edu/class/cs106ax/res/lectures/02-JavaScript-Basics.pptx'},
 {'id':'auckland-python-basics','name':'Auckland · Python Basics','file':'auckland-python-basics.pptx','sourceUrl':'https://www.cs.auckland.ac.nz/courses/compsci107s1c/lectures/lecture-02.pptx'},
 {'id':'auckland-python-introduction','name':'Auckland · Python Introduction','file':'auckland-python-introduction.pptx','sourceUrl':'https://www.cs.auckland.ac.nz/courses/compsci107s1c/lectures/lecture-01.pptx'},
]

def serialize(node):return ET.tostring(node,encoding='utf-8',xml_declaration=True)
def relationship_path(path):return posixpath.join(posixpath.dirname(path),'_rels',posixpath.basename(path)+'.rels')
def resolve(owner,rel):
 if rel.attrib.get('TargetMode')=='External':raise ValueError('External part')
 target=rel.attrib['Target']
 return target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(owner),target))
def drawing_text(root):
 out=[]
 def walk(node):
  if node.tag==f'{{{A}}}t':out.append(node.text or '');return
  if node.tag==f'{{{A}}}br':out.append('\n')
  for child in node:walk(child)
  if node.tag==f'{{{A}}}p' and out and not out[-1].endswith('\n'):out.append('\n')
 walk(root)
 return ''.join(out).strip()
def expected(path):
 with zipfile.ZipFile(path) as z:
  rootrels=ET.fromstring(z.read('_rels/.rels'))
  pres=resolve('',next(r for r in rootrels if r.attrib['Type'].endswith('/officeDocument')))
  doc=ET.fromstring(z.read(pres));rels={r.attrib['Id']:r for r in ET.fromstring(z.read(relationship_path(pres)))}
  texts=[];note_count=0
  for item in doc.find(f'{{{P}}}sldIdLst'):
   slidepath=resolve(pres,rels[item.attrib[f'{{{R}}}id']]);slide=ET.fromstring(z.read(slidepath));text=drawing_text(slide)
   relpath=relationship_path(slidepath);note=''
   if relpath in z.namelist():
    for r in ET.fromstring(z.read(relpath)):
     if r.attrib['Type'].endswith('/notesSlide'):
      notes=ET.fromstring(z.read(resolve(slidepath,r)))
      bodies=[shape for shape in notes.iter(f'{{{P}}}sp') if any(ph.attrib.get('type')=='body' for ph in shape.iter(f'{{{P}}}ph'))]
      note='\n'.join(filter(None,map(drawing_text,bodies))).strip() or drawing_text(notes)
      if note:note_count+=1
   texts.append(text+ ('\n\n' if text and note else '')+('Notes:\n'+note if note else ''))
  alltext='\n\n---\n\n'.join(texts)
  return {'slides':len(texts),'nonemptySlides':sum(bool(t) for t in texts),'slidesWithNotes':note_count,'characters':len(alltext),'textBytes':len(alltext.encode()),'textSha256':hashlib.sha256(alltext.encode()).hexdigest()}

def stress(source,destination,count=300,duplicate_media=False):
 with zipfile.ZipFile(source) as z:
  parts={name:z.read(name) for name in z.namelist()}
  doc=ET.fromstring(parts['ppt/presentation.xml']);sldlist=doc.find(f'{{{P}}}sldIdLst');old=list(sldlist);sldlist.clear()
  rels=ET.fromstring(parts['ppt/_rels/presentation.xml.rels']);slides={r.attrib['Id']:r for r in rels if r.attrib['Type'].endswith('/slide')}
  for r in list(rels):
   if r.attrib['Type'].endswith('/slide'):rels.remove(r)
  types=ET.fromstring(parts['[Content_Types].xml']);oldtypes=list(types)
  cycles=(count+len(old)-1)//len(old)
  if duplicate_media:
   for cycle in range(1,cycles):
    prefix=f'stress/cycle_{cycle}/'
    for name,data in list(parts.copy().items()):
     if name.startswith('ppt/'):
      parts[prefix+name]=data
    for item in oldtypes:
     if item.tag==f'{{{CT}}}Override' and item.attrib['PartName'].startswith('/ppt/'):
      copied=copy.deepcopy(item);copied.attrib['PartName']='/'+prefix+item.attrib['PartName'].lstrip('/');types.append(copied)
  for i in range(count):
   original=old[i%len(old)];relation=slides[original.attrib[f'{{{R}}}id']]
   path=resolve('ppt/presentation.xml',relation)
   if duplicate_media and i//len(old):
    target='../'+f'stress/cycle_{i//len(old)}/'+path
   else:
    # Copy actual slide XML/relationships but share their original media and layouts.
    newpath=f'ppt/slides/stressSlide{i+1}.xml';parts[newpath]=parts[path]
    oldrel=relationship_path(path)
    if oldrel in parts:parts[relationship_path(newpath)]=parts[oldrel]
    target=posixpath.relpath(newpath,'ppt')
    types.append(ET.Element(f'{{{CT}}}Override',{'PartName':'/'+newpath,'ContentType':'application/vnd.openxmlformats-officedocument.presentationml.slide+xml'}))
   rid=f'rIdStress{i+1}'
   ET.SubElement(sldlist,f'{{{P}}}sldId',{'id':str(10000+i),f'{{{R}}}id':rid})
   ET.SubElement(rels,f'{{{PKG}}}Relationship',{'Id':rid,'Type':R+'/slide','Target':target})
  parts['ppt/presentation.xml']=serialize(doc);parts['ppt/_rels/presentation.xml.rels']=serialize(rels);parts['[Content_Types].xml']=serialize(types)
  app='docProps/app.xml'
  if app in parts:
   appdoc=ET.fromstring(parts[app])
   for el in appdoc.iter():
    if el.tag.endswith('}Slides'):el.text=str(count)
   parts[app]=serialize(appdoc)
  with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as out:
   for name,data in parts.items():out.writestr(name,data)

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--download',action='store_true');args=parser.parse_args()
 SAMPLES.mkdir(exist_ok=True)
 rows=[]
 for source in ORIGINALS:
  path=SAMPLES/source['file']
  if args.download or not path.exists():
   with urllib.request.urlopen(source['sourceUrl'],timeout=45) as response:data=response.read(100*1024*1024+1)
   if len(data)>100*1024*1024:raise ValueError('Download exceeds 100 MiB')
   path.write_bytes(data)
  rows.append({**source,'kind':'downloaded','bytes':path.stat().st_size,**expected(path)})
 for original,media in [(ORIGINALS[1],False),(ORIGINALS[3],True)]:
  name='stress-300-image-heavy' if media else 'stress-300-text'
  path=SAMPLES/(name+'.pptx');stress(SAMPLES/original['file'],path,duplicate_media=media)
  rows.append({'id':name,'name':'Synthetic · 300 slides · '+('duplicated media' if media else 'shared media'),'file':path.name,'sourceUrl':original['sourceUrl'],'kind':'synthetic','derivedFrom':original['file'],'construction':'Real lecture slides repeated to 300; '+('media duplicated between cycles' if media else 'original media reused'),'bytes':path.stat().st_size,**expected(path)})
 (SAMPLES/'manifest.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n')
 for row in rows:print(row['id'],row['slides'],f"{row['bytes']/1e6:.2f} MB",row['kind'])
if __name__=='__main__':main()
