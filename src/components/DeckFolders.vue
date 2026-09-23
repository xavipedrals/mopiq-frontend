<template>
  <section class="folders" :aria-label="$t('deck.folders')">
    <h2>{{ $t('deck.folders') }}</h2>
    <ul v-if="rows.length" class="folder-list">
      <li v-for="row in rows" :key="row.folder.id">
        <div
          class="folder-row"
          :style="{ paddingLeft: `${row.depth * 20}px` }"
          @contextmenu.prevent="openMenu(row, $event)"
        >
          <button
            type="button"
            class="folder-icon"
            :aria-label="row.hasChildren ? (row.expanded ? $t('common.close') : $t('deck.folders')) : row.folder.title"
            :aria-expanded="row.hasChildren ? String(row.expanded) : undefined"
            @click="onIconClick(row)"
          >
            <StudyMenuIcon name="folder" />
            <span v-if="row.hasChildren" class="expand" :class="{ open: row.expanded }" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
          <button type="button" class="folder-main" @click="$emit('open', row.folder)">
            <span class="folder-title">{{ row.folder.title }}</span>
            <span class="folder-count">{{ $t('decks.cards', { count: counts[row.folder.id] || 0 }) }}</span>
          </button>
          <span class="chevron" aria-hidden="true" @click="$emit('open', row.folder)">
            <StudyMenuIcon name="chevronRight" />
          </span>
          <button
            v-if="canEdit"
            type="button"
            class="folder-menu"
            :aria-label="$t('deck.folderActions')"
            :aria-expanded="menuFolderId === row.folder.id ? 'true' : 'false'"
            @click.stop="openMenu(row, $event)"
          >
            <StudyMenuIcon name="dotsVertical" />
          </button>
        </div>
      </li>
    </ul>
    <button
      v-if="canEdit && canAdd"
      type="button"
      class="add-folder"
      :disabled="busy"
      @click="startAdd(parent)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5V18a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M12 11.5v5M9.5 14h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      {{ $t('deck.addFolder') }}
    </button>

    <Teleport to="body">
      <div v-if="menuFolder" class="menu-root">
        <button type="button" class="menu-backdrop" :aria-label="$t('common.close')" @click="menuFolderId = null"></button>
        <section class="menu-panel" role="menu" :style="menuStyle">
          <button
            v-if="canAddUnder(menuFolder)"
            type="button"
            class="menu-item"
            role="menuitem"
            @click="startAdd(menuFolder)"
          >
            <span>{{ $t('deck.addSubfolder') }}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5V18a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M16.5 11.5v4M14.5 13.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <button type="button" class="menu-item" role="menuitem" @click="startRename(menuFolder)">
            <span>{{ $t('deck.renameFolder') }}</span>
            <StudyMenuIcon name="edit" />
          </button>
          <div class="menu-rule"></div>
          <button type="button" class="menu-item danger" role="menuitem" @click="askDelete(menuFolder)">
            <span>{{ $t('deck.deleteFolder') }}</span>
            <StudyMenuIcon name="trash" />
          </button>
        </section>
      </div>
      <div v-if="prompt" class="prompt-root">
        <button type="button" class="prompt-backdrop" :aria-label="$t('common.cancel')" @click="prompt = null"></button>
        <form class="prompt" @submit.prevent="submitPrompt">
          <h3>{{ prompt.title }}</h3>
          <p v-if="prompt.message">{{ prompt.message }}</p>
          <label>
            <span class="sr-only">{{ $t('deck.folderName') }}</span>
            <input
              ref="nameInput"
              v-model="prompt.name"
              type="text"
              maxlength="80"
              :placeholder="$t('deck.folderName')"
              required
            >
          </label>
          <p v-if="prompt.error" class="prompt-error">{{ prompt.error }}</p>
          <div class="prompt-actions">
            <button type="button" class="text" @click="prompt = null">{{ $t('common.cancel') }}</button>
            <button type="submit" class="ok">{{ $t('common.ok') }}</button>
          </div>
        </form>
      </div>
      <div v-if="pendingDelete" class="prompt-root">
        <button type="button" class="prompt-backdrop" :aria-label="$t('common.cancel')" @click="pendingDelete = null"></button>
        <form class="prompt" @submit.prevent="confirmDelete">
          <h3>{{ $t('deck.deleteFolder') }}</h3>
          <p>{{ $t('deck.deleteFolderMessage') }}</p>
          <div class="prompt-actions">
            <button type="button" class="text" @click="pendingDelete = null">{{ $t('common.cancel') }}</button>
            <button type="submit" class="danger">{{ $t('deck.deleteFolder') }}</button>
          </div>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<script>
import StudyMenuIcon from './StudyMenuIcon.vue';
import {
  addFolder,
  flattenFolderRows,
  folderCanAddChild,
  renameFolder,
  FolderEditError,
} from '../study/deckFolders';

const ERROR_KEYS = {
  empty: 'deck.folderNameEmpty',
  invalid: 'deck.folderNameInvalid',
  exists: 'deck.folderAlreadyExists',
  path: 'deck.folderPathNotFound',
  depth: 'deck.folderTooDeep',
};

export default {
  name: 'DeckFolders',
  components: { StudyMenuIcon },
  props: {
    folders: { type: Array, default: () => [] },
    parent: { type: Object, default: null },
    counts: { type: Object, default: () => ({}) },
    decks: { type: [Object, String], default: () => ({}) },
    deckName: { type: String, default: '' },
    canEdit: { type: Boolean, default: false },
    canAdd: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
  },
  emits: ['open', 'add', 'rename', 'remove'],
  data() {
    return {
      expandedIds: {},
      menuFolderId: null,
      menuStyle: {},
      prompt: null,
      pendingDelete: null,
    };
  },
  computed: {
    rows() {
      return flattenFolderRows(this.folders, this.parent, this.expandedIds);
    },
    menuFolder() {
      return this.rows.find((row) => row.folder.id === this.menuFolderId)?.folder || null;
    },
  },
  watch: {
    'parent.id'() {
      this.expandedIds = {};
      this.menuFolderId = null;
    },
  },
  methods: {
    canAddUnder(folder) {
      return folderCanAddChild(folder);
    },
    onIconClick(row) {
      if (!row.hasChildren) {
        this.$emit('open', row.folder);
        return;
      }
      const next = { ...this.expandedIds };
      if (next[row.folder.id]) delete next[row.folder.id];
      else next[row.folder.id] = true;
      this.expandedIds = next;
    },
    openMenu(row, event) {
      if (!this.canEdit || this.busy) return;
      this.menuFolderId = row.folder.id;
      const rect = event.currentTarget?.getBoundingClientRect?.() || { right: window.innerWidth - 24, bottom: 120, top: 80 };
      const width = Math.min(280, window.innerWidth - 20);
      const top = Math.min(rect.bottom + 6, window.innerHeight - 180);
      this.menuStyle = {
        top: `${Math.max(10, top)}px`,
        right: `${Math.max(10, window.innerWidth - rect.right)}px`,
        width: `${width}px`,
      };
    },
    errorText(error) {
      const key = error instanceof FolderEditError ? ERROR_KEYS[error.code] : '';
      return key ? this.$t(key) : (error?.message || this.$t('study.actionError'));
    },
    startAdd(parent) {
      this.menuFolderId = null;
      if (!parent || !folderCanAddChild(parent)) return;
      const nested = parent.id !== this.parent?.id;
      this.prompt = {
        kind: 'add',
        parent,
        name: '',
        error: '',
        title: this.$t(nested ? 'deck.addSubfolder' : 'deck.addFolder'),
        message: nested
          ? this.$t('deck.addSubfolderMessage', { folder: parent.fullPath.replace(/::/g, ' → ') })
          : '',
      };
      this.focusPrompt();
    },
    startRename(folder) {
      this.menuFolderId = null;
      this.prompt = {
        kind: 'rename',
        folder,
        name: folder.title,
        error: '',
        title: this.$t('deck.renameFolder'),
        message: '',
      };
      this.focusPrompt();
    },
    focusPrompt() {
      this.$nextTick(() => {
        const input = this.$refs.nameInput;
        input?.focus();
        input?.select();
      });
    },
    submitPrompt() {
      if (!this.prompt || this.busy) return;
      try {
        if (this.prompt.kind === 'add') {
          addFolder(this.decks, this.prompt.parent.fullPath, this.prompt.name, this.deckName);
          this.$emit('add', { parent: this.prompt.parent, name: this.prompt.name });
        } else {
          renameFolder(this.decks, this.prompt.folder.id, this.prompt.name, this.deckName);
          this.$emit('rename', { folder: this.prompt.folder, name: this.prompt.name });
        }
        this.prompt = null;
      } catch (error) {
        this.prompt = { ...this.prompt, error: this.errorText(error) };
      }
    },
    askDelete(folder) {
      this.menuFolderId = null;
      this.pendingDelete = folder;
    },
    confirmDelete() {
      if (!this.pendingDelete) return;
      this.$emit('remove', this.pendingDelete);
      this.pendingDelete = null;
    },
  },
};
</script>

<style scoped>
.folders {
  margin-top: 18px;
  padding: 24px 18px 18px;
  border-radius: 24px;
  background: var(--card-bg);
  border: 1px solid var(--stat-card-border);
}
h2 {
  margin: 0 0 10px;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--title);
}
.folder-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.folder-row {
  display: flex;
  align-items: center;
  min-height: 52px;
  gap: 0;
}
.folder-icon,
.folder-menu {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 8px;
  background: transparent !important;
  color: #64748b;
  cursor: pointer;
  flex: 0 0 auto;
}
.folder-icon :deep(.tabler-icon),
.folder-menu :deep(.tabler-icon),
.chevron :deep(.tabler-icon) {
  width: 22px;
  height: 22px;
}
.folder-menu :deep(.tabler-icon) { width: 18px; height: 18px; }
.expand {
  position: absolute;
  right: 2px;
  bottom: 2px;
  display: flex;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--blue-button);
  color: var(--button-text, #fff);
  box-shadow: 0 0 0 2px var(--card-bg);
}
.expand svg { width: 10px; height: 10px; display: block; margin: auto; }
.expand.open svg { transform: rotate(90deg); }
.folder-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 8px 8px 8px 8px !important;
  border: 0 !important;
  background: transparent !important;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.folder-title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1rem;
  color: var(--title);
}
.folder-count {
  margin-top: 2px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.chevron {
  display: inline-flex;
  color: #94a3b8;
  margin-right: 4px;
  cursor: pointer;
}
.folder-menu { color: var(--text-secondary); }
.folder-icon:hover,
.folder-menu:hover,
.folder-main:hover { background: color-mix(in srgb, var(--text) 6%, transparent) !important; }
.add-folder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 52px;
  margin-top: 8px;
  border: 0;
  border-radius: 14px;
  background: color-mix(in srgb, var(--blue-button) 15%, transparent);
  color: var(--blue-button);
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
}
.add-folder svg { width: 18px; height: 18px; display: block; }
.add-folder:disabled { opacity: 0.55; cursor: default; }
.menu-root,
.prompt-root { position: fixed; inset: 0; z-index: 80; }
.menu-backdrop,
.prompt-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: transparent;
}
.prompt-backdrop { background: rgba(15, 23, 42, 0.28); }
.menu-panel,
.prompt {
  position: absolute;
  padding: 6px;
  background: color-mix(in srgb, var(--card-bg) 92%, transparent);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 0.5px solid color-mix(in srgb, var(--text) 12%, transparent);
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.22);
}
.prompt {
  left: 50%;
  top: 22%;
  transform: translateX(-50%);
  width: min(420px, calc(100% - 32px));
  padding: 18px;
}
.prompt h3 { margin: 0 0 8px; color: var(--title); font-size: 1.15rem; }
.prompt p { margin: 0 0 12px; color: var(--text); }
.prompt input {
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--text) 18%, transparent);
  background: var(--card-bg);
  color: var(--title);
  font: inherit;
}
.prompt-error { color: #ff3b30 !important; }
.prompt-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.prompt-actions button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.prompt-actions .text { color: var(--text); }
.prompt-actions .ok { color: var(--button-text, #fff); background: var(--blue-button); }
.prompt-actions .danger { color: #fff; background: #ff3b30; }
.menu-item {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px !important;
  border: 0 !important;
  border-radius: 8px !important;
  background: transparent !important;
  color: var(--title) !important;
  font: inherit !important;
  font-size: 1.0625rem !important;
  text-align: left;
  cursor: pointer;
}
.menu-item svg,
.menu-item :deep(.tabler-icon) { width: 18px; height: 18px; color: var(--text); }
.menu-item.danger,
.menu-item.danger :deep(.tabler-icon) { color: #ff3b30 !important; }
.menu-item:hover { background: color-mix(in srgb, var(--text) 8%, transparent) !important; }
.menu-rule { height: 0.5px; margin: 4px 8px; background: color-mix(in srgb, var(--text) 14%, transparent); }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
