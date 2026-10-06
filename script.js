document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_SHORTCUTS = [
        { id: '1', type: 'link', categoryId: 'all', name: 'Notion', url: 'https://notion.so', icon: 'https://icon.horse/icon/notion.so', isCustomIcon: false },
        { id: '2', type: 'link', categoryId: 'all', name: 'GitHub', url: 'https://github.com', icon: 'https://icon.horse/icon/github.com', isCustomIcon: false },
        { id: '3', type: 'link', categoryId: 'all', name: 'LM Studio', url: 'https://lmstudio.ai', icon: 'https://icon.horse/icon/lmstudio.ai', isCustomIcon: false },
        { id: '4', type: 'link', categoryId: 'all', name: 'Affinity', url: 'https://affinity.serif.com', icon: 'https://icon.horse/icon/affinity.serif.com', isCustomIcon: false },
        { id: '5', type: 'link', categoryId: 'all', name: 'Spotify', url: 'https://open.spotify.com', icon: 'https://icon.horse/icon/spotify.com', isCustomIcon: false }
    ];

    let state = {
        shortcuts: JSON.parse(localStorage.getItem('rg_shortcuts')) || DEFAULT_SHORTCUTS,
        categories: JSON.parse(localStorage.getItem('rg_categories')) || [{ id: 'all', name: 'All' }],
        activeFolderId: null,
        draggedId: null,
        draggedCategoryId: null,
        contextTargetId: null,
        contextTargetCategoryId: null,
        activeCategoryId: 'all'
    };

    state.shortcuts.forEach(s => { if (!s.categoryId) s.categoryId = 'all'; });

    function saveShortcuts() {
        localStorage.setItem('rg_shortcuts', JSON.stringify(state.shortcuts));
    }

    function saveCategories() {
        localStorage.setItem('rg_categories', JSON.stringify(state.categories));
    }

    // === CLOCK ===
    function tickClock() {
        const now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    tickClock();
    setInterval(tickClock, 1000);

    // === SEARCH ===
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (!query) return;
            if (/^(http|https):\/\//.test(query)) {
                window.location.href = query;
            } else if (query.includes('.') && !query.includes(' ')) {
                window.location.href = `https://${query}`;
            } else {
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
        }
    });

    // === RENDER CATEGORY BAR ===
    const categoryBar = document.getElementById('category-bar');
    
    function renderCategories() {
        categoryBar.innerHTML = '';
        state.categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `category-tab ${state.activeCategoryId === cat.id ? 'active' : ''}`;
            btn.textContent = cat.name;
            
            if (cat.id !== 'all') {
                btn.draggable = true;
            }
            
            btn.addEventListener('click', () => {
                state.activeCategoryId = cat.id;
                renderCategories();
                renderMainGrid();
            });

            btn.addEventListener('dragstart', (e) => {
                if (cat.id === 'all') { e.preventDefault(); return; }
                state.draggedCategoryId = cat.id;
                btn.classList.add('dragging-cat');
                e.dataTransfer.setData('text/plain', cat.id);
            });

            btn.addEventListener('dragend', () => {
                state.draggedCategoryId = null;
                btn.classList.remove('dragging-cat');
                document.querySelectorAll('.category-tab').forEach(node => {
                    node.classList.remove('drag-over-folder', 'drag-over-cat-left', 'drag-over-cat-right');
                });
            });

            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (state.draggedId) {
                    btn.classList.add('drag-over-folder');
                    return;
                }
                if (state.draggedCategoryId && state.draggedCategoryId !== cat.id) {
                    const rect = btn.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    btn.classList.remove('drag-over-folder', 'drag-over-cat-left', 'drag-over-cat-right');
                    if (x < rect.width / 2) {
                        btn.classList.add('drag-over-cat-left');
                    } else {
                        btn.classList.add('drag-over-cat-right');
                    }
                }
            });
            
            btn.addEventListener('dragleave', () => {
                btn.classList.remove('drag-over-folder', 'drag-over-cat-left', 'drag-over-cat-right');
            });
            
            btn.addEventListener('drop', (e) => {
                e.preventDefault();
                btn.classList.remove('drag-over-folder', 'drag-over-cat-left', 'drag-over-cat-right');
                
                if (state.draggedId && state.activeCategoryId !== cat.id) {
                    const itemIndex = state.shortcuts.findIndex(i => i.id === state.draggedId);
                    if (itemIndex !== -1) {
                        state.shortcuts[itemIndex].categoryId = cat.id;
                        saveShortcuts();
                        state.activeCategoryId = cat.id;
                        renderCategories();
                        renderMainGrid();
                    }
                }
                
                if (state.draggedCategoryId && state.draggedCategoryId !== cat.id) {
                    let dropType = 'right';
                    const rect = btn.getBoundingClientRect();
                    if (e.clientX - rect.left < rect.width / 2) {
                        dropType = 'left';
                    }

                    const draggedIndex = state.categories.findIndex(c => c.id === state.draggedCategoryId);
                    const targetIndex = state.categories.findIndex(c => c.id === cat.id);

                    if (draggedIndex !== -1 && targetIndex !== -1) {
                        const draggedCat = state.categories.splice(draggedIndex, 1)[0];
                        let newTargetIndex = state.categories.findIndex(c => c.id === cat.id);
                        if (dropType === 'right') newTargetIndex++;
                        if (newTargetIndex === 0 && state.categories[0].id === 'all') newTargetIndex = 1;
                        state.categories.splice(newTargetIndex, 0, draggedCat);
                        saveCategories();
                        renderCategories();
                    }
                }
            });

            btn.addEventListener('contextmenu', (e) => {
                if (cat.id !== 'all') {
                    e.preventDefault();
                    showCategoryContextMenu(e.pageX, e.pageY, cat.id);
                }
            });

            categoryBar.appendChild(btn);
        });

        const addCatBtn = document.createElement('button');
        addCatBtn.className = 'category-add-btn';
        addCatBtn.textContent = '+';
        addCatBtn.title = 'Add Category';
        addCatBtn.addEventListener('click', () => {
            const name = prompt("Enter new category name:");
            if (name && name.trim()) {
                const newCat = { id: 'cat_' + Date.now(), name: name.trim() };
                state.categories.push(newCat);
                saveCategories();
                renderCategories();
                populateCategoryDropdown();
            }
        });
        categoryBar.appendChild(addCatBtn);
    }

    // === RENDER SHORTCUTS ===
    const shortcutGrid = document.getElementById('shortcut-grid');
    const folderOverlay = document.getElementById('folder-overlay');
    const folderGrid = document.getElementById('folder-grid');
    const folderTitleInput = document.getElementById('folder-title-input');

    function createShortcutElement(item) {
        const el = document.createElement('div');
        el.className = 'shortcut-item';
        el.draggable = true;
        el.dataset.id = item.id;

        if (item.type === 'folder') {
            const previewImages = item.items.slice(0, 4).map(sub => `<img src="${sub.icon}">`).join('');
            el.innerHTML = `
                <div class="icon-square">
                    <div class="folder-preview">${previewImages}</div>
                </div>
                <span class="shortcut-label">${item.name}</span>
            `;
            el.addEventListener('click', () => openFolder(item.id));
        } else {
            el.innerHTML = `
                <div class="icon-square">
                    <img src="${item.icon}" alt="${item.name}">
                </div>
                <span class="shortcut-label">${item.name}</span>
            `;
            el.addEventListener('click', (e) => {
                if (e.button === 0) window.location.href = item.url;
            });
        }

        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.pageX, e.pageY, item.id);
        });

        el.addEventListener('dragstart', (e) => {
            state.draggedId = item.id;
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', item.id);
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
            document.querySelectorAll('.shortcut-item, .category-tab').forEach(node => {
                node.classList.remove('drag-over-folder', 'drag-over-left', 'drag-over-right');
            });
        });

        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (state.draggedId === item.id) return;
            
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            el.classList.remove('drag-over-folder', 'drag-over-left', 'drag-over-right');
            
            if (x < rect.width * 0.25) {
                el.classList.add('drag-over-left');
            } else if (x > rect.width * 0.75) {
                el.classList.add('drag-over-right');
            } else {
                el.classList.add('drag-over-folder');
            }
        });

        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over-folder', 'drag-over-left', 'drag-over-right');
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            let dropType = 'folder';
            if (el.classList.contains('drag-over-left')) dropType = 'left';
            if (el.classList.contains('drag-over-right')) dropType = 'right';

            el.classList.remove('drag-over-folder', 'drag-over-left', 'drag-over-right');
            handleDrop(state.draggedId, item.id, dropType);
        });

        return el;
    }

    function renderMainGrid() {
        shortcutGrid.innerHTML = '';
        
        const showCategories = document.getElementById('pref-categories').checked;
        let visibleShortcuts = state.shortcuts;

        if (showCategories && state.activeCategoryId !== 'all') {
            visibleShortcuts = state.shortcuts.filter(s => s.categoryId === state.activeCategoryId);
        }

        visibleShortcuts.forEach(item => {
            shortcutGrid.appendChild(createShortcutElement(item));
        });

        const addBtn = document.createElement('div');
        addBtn.className = 'shortcut-item add-btn';
        addBtn.innerHTML = `
            <div class="icon-square">+</div>
            <span class="shortcut-label">Add site</span>
        `;
        addBtn.addEventListener('click', () => openEditModal());
        shortcutGrid.appendChild(addBtn);
    }

    // === ADVANCED DRAG & DROP LOGIC ===
    function handleDrop(draggedId, targetId, dropType) {
        if (!draggedId || draggedId === targetId) return;

        let arrayToModify = state.shortcuts;
        if (state.activeFolderId) {
            const folder = state.shortcuts.find(i => i.id === state.activeFolderId);
            if (folder) arrayToModify = folder.items;
        }

        const draggedIndex = arrayToModify.findIndex(i => i.id === draggedId);
        const targetIndex = arrayToModify.findIndex(i => i.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const draggedItem = arrayToModify[draggedIndex];
        const targetItem = arrayToModify[targetIndex];

        if (dropType === 'left' || dropType === 'right') {
            arrayToModify.splice(draggedIndex, 1);
            let newTargetIndex = arrayToModify.findIndex(i => i.id === targetId);
            if (dropType === 'right') newTargetIndex++;
            arrayToModify.splice(newTargetIndex, 0, draggedItem);
        } else {
            if (state.activeFolderId) return;

            if (targetItem.type === 'folder') {
                if (draggedItem.type !== 'folder') {
                    targetItem.items.push(draggedItem);
                    arrayToModify.splice(draggedIndex, 1);
                }
            } else {
                arrayToModify.splice(draggedIndex, 1);
                const newFolder = {
                    id: 'folder_' + Date.now(),
                    type: 'folder',
                    categoryId: targetItem.categoryId,
                    name: 'New Folder',
                    items: [targetItem, draggedItem]
                };
                const newTargetIdx = arrayToModify.findIndex(i => i.id === targetId);
                arrayToModify.splice(newTargetIdx, 1, newFolder);
            }
        }

        saveShortcuts();
        if (state.activeFolderId) openFolder(state.activeFolderId);
        else renderMainGrid();
    }

    // === EXTRACT OUT OF FOLDER ===
    folderOverlay.addEventListener('dragover', (e) => {
        if (e.target === folderOverlay) e.preventDefault();
    });

    folderOverlay.addEventListener('drop', (e) => {
        if (e.target === folderOverlay) {
            e.preventDefault();
            if (state.activeFolderId && state.draggedId) moveOutOfFolder(state.draggedId);
        }
    });

    function moveOutOfFolder(itemId) {
        const folderIndex = state.shortcuts.findIndex(i => i.id === state.activeFolderId);
        if (folderIndex === -1) return;
        
        const folder = state.shortcuts[folderIndex];
        const itemIndex = folder.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;
        
        const item = folder.items.splice(itemIndex, 1)[0];
        item.categoryId = folder.categoryId; 
        state.shortcuts.push(item);
        
        if (folder.items.length === 0) {
            state.shortcuts.splice(folderIndex, 1);
            saveShortcuts();
            closeFolder();
        } else {
            saveShortcuts();
            openFolder(state.activeFolderId);
        }
    }

    // === MODAL CLOSING LOGIC ===
    function closeFolder() {
        state.activeFolderId = null;
        folderOverlay.classList.add('hidden');
        renderMainGrid();
    }
    
    folderOverlay.addEventListener('click', (e) => { if (e.target === folderOverlay) closeFolder(); });
    const settingsModal = document.getElementById('settings-modal');
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });
    const itemModal = document.getElementById('item-modal');
    itemModal.addEventListener('click', (e) => { if (e.target === itemModal) itemModal.classList.add('hidden'); });

    // === FOLDER VIEW ===
    function openFolder(folderId) {
        state.activeFolderId = folderId;
        const folder = state.shortcuts.find(i => i.id === folderId);
        if (!folder) return;

        folderTitleInput.value = folder.name;
        folderGrid.innerHTML = '';
        folder.items.forEach(item => {
            folderGrid.appendChild(createShortcutElement(item));
        });

        folderOverlay.classList.remove('hidden');
    }

    document.getElementById('folder-back-btn').addEventListener('click', closeFolder);
    document.getElementById('folder-close-btn').addEventListener('click', closeFolder);

    folderTitleInput.addEventListener('change', () => {
        if (state.activeFolderId) {
            const folder = state.shortcuts.find(i => i.id === state.activeFolderId);
            if (folder) {
                folder.name = folderTitleInput.value.trim() || 'Folder';
                saveShortcuts();
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (state.activeFolderId !== null && (e.button === 3 || e.button === 4)) {
            e.preventDefault();
            closeFolder();
        }
    });

    // === CONTEXT MENUS ===
    const contextMenu = document.getElementById('context-menu');
    const catContextMenu = document.getElementById('category-context-menu');

    window.addEventListener('click', () => {
        contextMenu.classList.add('hidden');
        catContextMenu.classList.add('hidden');
    });

    function showContextMenu(x, y, itemId) {
        state.contextTargetId = itemId;
        contextMenu.style.left = `${Math.min(x, window.innerWidth - 150)}px`;
        contextMenu.style.top = `${Math.min(y, window.innerHeight - 100)}px`;
        
        const outBtn = document.getElementById('ctx-action-out-folder');
        if (state.activeFolderId) outBtn.classList.remove('hidden');
        else outBtn.classList.add('hidden');

        contextMenu.classList.remove('hidden');
        catContextMenu.classList.add('hidden'); 
    }

    document.getElementById('ctx-action-out-folder').addEventListener('click', () => {
        if (!state.contextTargetId || !state.activeFolderId) return;
        moveOutOfFolder(state.contextTargetId);
        contextMenu.classList.add('hidden');
    });

    document.getElementById('ctx-action-delete').addEventListener('click', () => {
        if (!state.contextTargetId) return;
        if (state.activeFolderId) {
            const folderIdx = state.shortcuts.findIndex(i => i.id === state.activeFolderId);
            if (folderIdx !== -1) {
                state.shortcuts[folderIdx].items = state.shortcuts[folderIdx].items.filter(i => i.id !== state.contextTargetId);
                if (state.shortcuts[folderIdx].items.length === 0) {
                    state.shortcuts.splice(folderIdx, 1);
                    saveShortcuts();
                    closeFolder();
                } else {
                    saveShortcuts();
                    openFolder(state.activeFolderId);
                }
            }
        } else {
            state.shortcuts = state.shortcuts.filter(i => i.id !== state.contextTargetId);
            saveShortcuts();
            renderMainGrid();
        }
    });

    document.getElementById('ctx-action-edit').addEventListener('click', () => {
        if (!state.contextTargetId) return;
        let item = null;
        if (state.activeFolderId) {
            const folder = state.shortcuts.find(i => i.id === state.activeFolderId);
            if (folder) item = folder.items.find(i => i.id === state.contextTargetId);
        } else {
            item = state.shortcuts.find(i => i.id === state.contextTargetId);
        }
        if (item) openEditModal(item);
    });

    // === CATEGORY CONTEXT MENU ACTIONS ===
    function showCategoryContextMenu(x, y, catId) {
        state.contextTargetCategoryId = catId;
        catContextMenu.style.left = `${Math.min(x, window.innerWidth - 150)}px`;
        catContextMenu.style.top = `${Math.min(y, window.innerHeight - 100)}px`;
        catContextMenu.classList.remove('hidden');
        contextMenu.classList.add('hidden'); 
    }

    document.getElementById('ctx-cat-rename').addEventListener('click', () => {
        if (!state.contextTargetCategoryId) return;
        const cat = state.categories.find(c => c.id === state.contextTargetCategoryId);
        if (cat) {
            const newName = prompt("Rename category:", cat.name);
            if (newName && newName.trim()) {
                cat.name = newName.trim();
                saveCategories();
                renderCategories();
                populateCategoryDropdown();
            }
        }
        catContextMenu.classList.add('hidden');
    });

    document.getElementById('ctx-cat-delete').addEventListener('click', () => {
        if (!state.contextTargetCategoryId) return;
        const cat = state.categories.find(c => c.id === state.contextTargetCategoryId);
        if (cat) {
            if (confirm(`Delete category "${cat.name}"? Shortcuts inside will be moved back to "All".`)) {
                state.categories = state.categories.filter(c => c.id !== cat.id);
                state.shortcuts.forEach(s => { if(s.categoryId === cat.id) s.categoryId = 'all'; });
                if(state.activeCategoryId === cat.id) state.activeCategoryId = 'all';
                saveCategories();
                saveShortcuts();
                renderCategories();
                renderMainGrid();
                populateCategoryDropdown();
            }
        }
        catContextMenu.classList.add('hidden');
    });

    // === EDIT / ADD MODAL ===
    const modalName = document.getElementById('modal-item-name');
    const modalUrl = document.getElementById('modal-item-url');
    const modalIcon = document.getElementById('modal-item-icon');
    const modalCategory = document.getElementById('modal-item-category');
    let editingId = null;

    function populateCategoryDropdown() {
        modalCategory.innerHTML = '';
        state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            modalCategory.appendChild(opt);
        });
    }

    function openEditModal(item = null) {
        editingId = item ? item.id : null;
        document.getElementById('modal-title').textContent = item ? 'Edit Shortcut' : 'Add Shortcut';
        modalName.value = item ? item.name : '';
        modalUrl.value = item ? item.url : '';
        modalIcon.value = (item && item.isCustomIcon) ? item.icon : '';
        modalCategory.value = (item && item.categoryId) ? item.categoryId : state.activeCategoryId;
        
        if (!editingId && state.activeCategoryId === 'all') modalCategory.value = 'all';

        itemModal.classList.remove('hidden');
        modalName.focus();
    }

    document.getElementById('modal-close-btn').addEventListener('click', () => itemModal.classList.add('hidden'));
    
    function saveShortcutData() {
        let name = modalName.value.trim();
        let url = modalUrl.value.trim();
        let customIconUrl = modalIcon.value.trim();
        let categoryId = modalCategory.value;
        
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        
        let domain = 'example.com';
        try { domain = new URL(url).hostname; } 
        catch(e) { domain = url.replace('https://', '').replace('http://', '').split('/')[0]; }

        if (!name) {
            let cleanName = domain.replace(/^www\./i, '').split('.')[0];
            name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        }

        let icon = '';
        let isCustomIcon = false;
        
        if (customIconUrl) {
            icon = customIconUrl;
            isCustomIcon = true;
        } else {
            icon = `https://icon.horse/icon/${domain}`;
        }

        if (editingId) {
            const updateInArray = (arr) => {
                const idx = arr.findIndex(i => i.id === editingId);
                if (idx !== -1) arr[idx] = { ...arr[idx], name, url, icon, isCustomIcon, categoryId };
            };
            if (state.activeFolderId) {
                const folder = state.shortcuts.find(i => i.id === state.activeFolderId);
                if (folder) updateInArray(folder.items);
            } else {
                updateInArray(state.shortcuts);
            }
        } else {
            const newItem = { id: 'item_' + Date.now(), type: 'link', name, url, icon, isCustomIcon, categoryId };
            if (state.activeFolderId) {
                const folder = state.shortcuts.find(i => i.id === state.activeFolderId);
                if (folder) folder.items.push(newItem);
            } else {
                state.shortcuts.push(newItem);
            }
        }

        saveShortcuts();
        itemModal.classList.add('hidden');
        if (state.activeFolderId) openFolder(state.activeFolderId);
        else renderMainGrid();
    }

    document.getElementById('modal-save-btn').addEventListener('click', saveShortcutData);

    [modalName, modalUrl, modalIcon].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveShortcutData();
            }
        });
    });

    // === SETTINGS & PREFERENCES ===
    document.getElementById('settings-trigger').addEventListener('click', () => settingsModal.classList.remove('hidden'));
    document.getElementById('settings-close-btn').addEventListener('click', () => settingsModal.classList.add('hidden'));

    function applyPreferences() {
        const cols = document.getElementById('pref-cols').value;
        const rows = document.getElementById('pref-rows').value;
        const size = document.getElementById('pref-size').value;
        const blurAmount = document.getElementById('pref-blur').value;
        const autoBackupDays = document.getElementById('pref-autobackup-days').value;

        document.getElementById('label-cols').textContent = cols;
        document.getElementById('label-rows').textContent = rows;
        document.getElementById('label-size').textContent = size;
        document.getElementById('label-blur').textContent = blurAmount;
        document.getElementById('label-autobackup-days').textContent = autoBackupDays;

        document.documentElement.style.setProperty('--cols', cols);
        document.documentElement.style.setProperty('--rows', rows);
        document.documentElement.style.setProperty('--icon-size', `${size}px`);
        document.documentElement.style.setProperty('--blur-amount', `${blurAmount}px`);

        const showClock = document.getElementById('pref-clock').checked;
        const showSearch = document.getElementById('pref-search').checked;
        const glassBg = document.getElementById('pref-glass').checked;
        const showCategories = document.getElementById('pref-categories').checked;
        const autoBackup = document.getElementById('pref-autobackup').checked;

        // Toggle visibility of the slider container based on checkbox
        document.getElementById('autobackup-slider-container').style.display = autoBackup ? 'block' : 'none';

        document.getElementById('header-area').style.display = showClock ? 'block' : 'none';
        document.getElementById('search-area').style.display = showSearch ? 'flex' : 'none';
        document.getElementById('category-bar').style.display = showCategories ? 'flex' : 'none';
        document.body.classList.toggle('no-glass', !glassBg);

        localStorage.setItem('rg_prefs', JSON.stringify({ 
            cols, rows, size, showClock, showSearch, glassBg, blurAmount, showCategories, autoBackup, autoBackupDays 
        }));
        renderMainGrid();
    }

    ['pref-cols', 'pref-rows', 'pref-size', 'pref-blur', 'pref-autobackup-days'].forEach(id => {
        document.getElementById(id).addEventListener('input', applyPreferences);
    });
    ['pref-clock', 'pref-search', 'pref-glass', 'pref-categories', 'pref-autobackup'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyPreferences);
    });

    // === WALLPAPER & COMPRESSION ===
    const wallpaperInput = document.getElementById('wallpaper-input');
    const wallpaperBg = document.getElementById('wallpaper-bg');

    wallpaperInput.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 1920;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressed = canvas.toDataURL('image/jpeg', 0.82);
                try {
                    localStorage.setItem('rg_custom_wallpaper', compressed);
                    wallpaperBg.style.backgroundImage = `url(${compressed})`;
                } catch {
                    alert('Image is too large to fit in browser storage.');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('wallpaper-remove').addEventListener('click', () => {
        localStorage.removeItem('rg_custom_wallpaper');
        wallpaperBg.style.backgroundImage = '';
    });
    
    // === IMPORT & EXPORT LOGIC ===
    function triggerBackupDownload() {
        const backupData = {
            version: 2,
            shortcuts: state.shortcuts,
            categories: state.categories
        };
        const dateStr = new Date().toISOString().split('T')[0];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `rg_dashboard_backup_${dateStr}.json`);
        document.body.appendChild(downloadAnchorNode); 
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    document.getElementById('export-btn').addEventListener('click', () => {
        triggerBackupDownload();
        // Reset the auto-backup timer when a manual backup is performed
        localStorage.setItem('rg_last_backup_date', Date.now().toString());
    });

    const importInput = document.getElementById('import-input');
    importInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                if (Array.isArray(importedData)) {
                    state.shortcuts = importedData;
                    state.shortcuts.forEach(s => { if(!s.categoryId) s.categoryId = 'all'; });
                    saveShortcuts();
                    renderMainGrid();
                    alert('Old Backup format imported successfully!');
                } else if (importedData && importedData.shortcuts) {
                    state.shortcuts = importedData.shortcuts;
                    if (importedData.categories) {
                        state.categories = importedData.categories;
                        saveCategories();
                    }
                    saveShortcuts();
                    state.activeCategoryId = 'all'; 
                    renderCategories();
                    populateCategoryDropdown();
                    renderMainGrid();
                    alert('Dashboard backup (Shortcuts & Categories) imported successfully!');
                } else {
                    alert('Invalid backup file format.');
                }
            } catch (err) {
                alert('Error reading backup file. Please ensure it is a valid JSON file.');
            }
        };
        reader.readAsText(file);
        this.value = ''; 
    });

    // === AUTO-BACKUP CHECK ENGINE ===
    function checkAutoBackup() {
        const prefs = JSON.parse(localStorage.getItem('rg_prefs'));
        if (!prefs || !prefs.autoBackup) return;

        const lastBackupStr = localStorage.getItem('rg_last_backup_date');
        const now = Date.now();
        const daysInMs = parseInt(prefs.autoBackupDays || 7) * 24 * 60 * 60 * 1000;

        if (!lastBackupStr || (now - parseInt(lastBackupStr)) >= daysInMs) {
            triggerBackupDownload();
            localStorage.setItem('rg_last_backup_date', now.toString());
        }
    }

    // === BOOT SEQUENCE ===
    const savedPrefs = JSON.parse(localStorage.getItem('rg_prefs'));
    if (savedPrefs) {
        document.getElementById('pref-cols').value = savedPrefs.cols || 5;
        document.getElementById('pref-rows').value = savedPrefs.rows || 2;
        document.getElementById('pref-size').value = savedPrefs.size || 64;
        document.getElementById('pref-blur').value = savedPrefs.blurAmount !== undefined ? savedPrefs.blurAmount : 0;
        document.getElementById('pref-clock').checked = savedPrefs.showClock !== false;
        document.getElementById('pref-search').checked = savedPrefs.showSearch !== false;
        document.getElementById('pref-glass').checked = savedPrefs.glassBg !== false;
        document.getElementById('pref-categories').checked = savedPrefs.showCategories !== false;
        document.getElementById('pref-autobackup').checked = savedPrefs.autoBackup === true;
        document.getElementById('pref-autobackup-days').value = savedPrefs.autoBackupDays || 7;
    }
    
    renderCategories();
    populateCategoryDropdown();
    applyPreferences();
    checkAutoBackup(); // Run the backup check quietly on startup

    const savedWp = localStorage.getItem('rg_custom_wallpaper');
    if (savedWp) wallpaperBg.style.backgroundImage = `url(${savedWp})`;
});