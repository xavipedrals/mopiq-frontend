#!/usr/bin/env python3
from pathlib import Path
import json,zipfile
root=Path(__file__).resolve().parent/'word-fixtures';root.mkdir(exist_ok=True)
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
def document(body):return f'<w:document xmlns:w="{W}"><w:body>{body}</w:body></w:document>'
def p(text):return f'<w:p><w:r><w:t>{text}</w:t></w:r></w:p>'
def cell(text):return '<w:tc>'+p(text)+'</w:tc>'
def archive(name,xml,rels=None):
 path=root/name
 with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  z.writestr('_rels/.rels',rels or '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  z.writestr('word/document.xml',xml)
 return path
cases=[
 {'id':'paragraphs','body':p('Mitochondria produce ATP.')+p('Chloroplasts capture light.'),'expected':'Mitochondria produce ATP.\nChloroplasts capture light.'},
 {'id':'runs-entities-breaks','body':'<w:p><w:r><w:t>DNA &amp; </w:t></w:r><w:r><w:t>RNA &#x2014; β</w:t></w:r></w:p><w:p><w:r><w:t>Tabbed</w:t><w:tab/><w:t>value</w:t></w:r></w:p><w:p><w:r><w:t>Line</w:t><w:br/><w:t>break</w:t></w:r></w:p>','expected':'DNA & RNA — β\nTabbed\tvalue\n\nLine\nbreak'},
 {'id':'lists','body':'<w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>First point</w:t></w:r></w:p>'+p('Next paragraph'),'expected':'• First point\nNext paragraph'},
 {'id':'tables','body':p('Introduction')+'<w:tbl><w:tr>'+cell('Term')+cell('Definition')+'</w:tr><w:tr>'+cell('ATP')+cell('Energy currency')+'</w:tr></w:tbl>'+p('Conclusion'),'expected':'Introduction\n\nTerm | Definition\nATP | Energy currency\nConclusion'},
 {'id':'nested-tables','body':'<w:tbl><w:tr><w:tc>'+p('Outer')+'<w:tbl><w:tr>'+cell('Nested')+cell('Value')+'</w:tr></w:tbl>'+p('After')+'</w:tc>'+cell('Other')+'</w:tr></w:tbl>','expected':'Outer Nested | Value After | Other'},
 {'id':'tracked-changes','body':'<w:p><w:del><w:r><w:t>obsolete</w:t></w:r></w:del><w:moveFrom><w:r><w:t>moved away</w:t></w:r></w:moveFrom><w:r><w:instrText>HYPERLINK secret</w:instrText><w:t>Keep </w:t></w:r><w:ins><w:r><w:t>new text</w:t></w:r></w:ins></w:p>','expected':'Keep new text'},
 {'id':'page-breaks','body':'<w:p><w:r><w:t>Page one</w:t><w:br w:type="page"/><w:t>Page two</w:t></w:r></w:p>','expected':'Page one\n\n\n---\n\nPage two'},
 {'id':'empty','body':'<w:p/>','error':'docx_empty'},
]
rows=[]
for case in cases:
 path=archive(case['id']+'.docx',document(case['body']))
 rows.append({k:v for k,v in case.items() if k!='body'}|{'file':path.name})
xml=document(p('Présentation française — intérêts'))
archive('utf16.docx',b'\xff\xfe'+xml.encode('utf-16le'));rows.append({'id':'utf16','file':'utf16.docx','expected':'Présentation française — intérêts'})
archive('strict.docx',document(p('Strict namespaces work.')).replace(W,'http://purl.oclc.org/ooxml/wordprocessingml/main'));rows.append({'id':'strict','file':'strict.docx','expected':'Strict namespaces work.'})
archive('malformed.docx','<broken>');rows.append({'id':'malformed','file':'malformed.docx','invalid':True})
archive('doctype.docx','<!DOCTYPE w:document [<!ENTITY secret SYSTEM "file:///etc/passwd">]>'+document(p('&secret;')));rows.append({'id':'doctype','file':'doctype.docx','invalid':True})
archive('outside.docx',document(p('No outside file')), '<Relationships><Relationship Id="rId1" Type="x/officeDocument" Target="../../outside.xml"/></Relationships>');rows.append({'id':'outside','file':'outside.docx','invalid':True})
archive('not-word.docx','<presentation><p>Not a Word document.</p></presentation>');rows.append({'id':'not-word','file':'not-word.docx','invalid':True})
# Representative longer document; kept under the legacy generation text limit.
body=p('Biology lecture notes')+''.join(p(f'Lesson {i}: Cells use membranes to regulate transport and mitochondria to produce ATP. Learning relies on repeated practice.') for i in range(2300))
archive('Biology Lecture Notes.docx',document(body))
(root/'cases.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False))
print('Prepared',len(rows),'Word extraction cases and one longer document.')
