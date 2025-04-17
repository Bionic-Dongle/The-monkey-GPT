// ==UserScript==
// @name         ChatGPT Prompt Toolbar (Clean Version)
// @namespace    http://tampermonkey.net/
// @version      4.8
// @description  Prompt toolbar with copy-to-clipboard, re-orderable prompts, and DevGPT URL manager
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        none
// @updateURL   https://raw.githubusercontent.com/Bionic-Dongle/The-monkey-GPT/main/tampermonkey_script.js
// @downloadURL https://raw.githubusercontent.com/Bionic-Dongle/The-monkey-GPT/main/tampermonkey_script.js
// ==/UserScript==

(function () {
    'use strict';

    const defaultPrompts = {
        "Writing": ["Rewrite this more clearly:", "Make this more persuasive:", "Summarize this in plain English:"],
        "Coding": ["Explain this code:", "Convert this to Python:", "Find and fix the bug:"],
        "Creative": ["Write this as a poem:", "Turn this into a story:", "Add humor to this:"],
        "Control GPTs": ["Write this as a poem:", "Turn this into a story:", "Add humor to this:"]
    };

    const STORAGE_KEY = "chatgpt_custom_prompts_v4";
    const DEV_LINKS_KEY = "chatgpt_toolbar_dev_links";

    function getStoredPrompts() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(defaultPrompts));
        } catch {
            return JSON.parse(JSON.stringify(defaultPrompts));
        }
    }

    function savePrompts(prompts) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    }

    function getDevLinks() {
        try {
            const stored = localStorage.getItem(DEV_LINKS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    function saveDevLinks(links) {
        localStorage.setItem(DEV_LINKS_KEY, JSON.stringify(links));
    }

    function copyToClipboard(text, button, dropdown) {
        navigator.clipboard.writeText(text).then(() => {
            const original = button.textContent;
            button.textContent = "✔ Copied!";
            setTimeout(() => {
                button.textContent = original;
                dropdown.classList.remove('show');
            }, 1000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    function createToolbar() {
        if (document.getElementById("gpt-topbar")) return;

        const prompts = getStoredPrompts();

        const style = document.createElement('style');
        style.textContent = `
            .gpt-toolbar { /* unchanged styles */ }
            /* Keep all the existing styles here... */

            .gpt-dropdown-item.draggable {
                cursor: grab;
            }
            .gpt-dropdown-item.drag-over {
                background: #555 !important;
            }
        `;
        document.head.appendChild(style);

        const bar = document.createElement('div');
        bar.className = 'gpt-toolbar';
        bar.id = 'gpt-topbar';

        for (const category in prompts) {
            const wrapper = document.createElement('div');
            wrapper.className = 'gpt-dropdown-wrapper';

            const button = document.createElement('div');
            button.className = 'gpt-dropdown-button';
            button.textContent = category;

            const list = document.createElement('div');
            list.className = 'gpt-dropdown-list';

            function refreshList() {
                list.innerHTML = '';
                prompts[category].forEach((prompt, index) => {
                    const item = document.createElement('div');
                    item.className = 'gpt-dropdown-item draggable';
                    item.draggable = true;

                    item.ondragstart = (e) => {
                        e.dataTransfer.setData("text/plain", index);
                        item.classList.add("dragging");
                    };

                    item.ondragover = (e) => {
                        e.preventDefault();
                        item.classList.add("drag-over");
                    };

                    item.ondragleave = () => {
                        item.classList.remove("drag-over");
                    };

                    item.ondrop = (e) => {
                        e.preventDefault();
                        item.classList.remove("drag-over");
                        const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
                        const targetIndex = index;

                        if (draggedIndex !== targetIndex) {
                            const movedItem = prompts[category].splice(draggedIndex, 1)[0];
                            prompts[category].splice(targetIndex, 0, movedItem);
                            savePrompts(prompts);
                            refreshList();
                        }
                    };

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'gpt-delete-button';
                    deleteBtn.textContent = '🗑 Delete';
                    deleteBtn.onclick = () => {
                        const confirmDelete = confirm("Are you sure you want to delete this prompt?");
                        if (confirmDelete) {
                            prompts[category].splice(index, 1);
                            savePrompts(prompts);
                            refreshList();
                        }
                    };

                    const promptText = document.createElement('div');
                    promptText.textContent = prompt;
                    promptText.style.flex = '1';

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'gpt-copy-button';
                    copyBtn.textContent = '📋 Copy';
                    copyBtn.onclick = () => copyToClipboard(prompt, copyBtn, list);

                    item.appendChild(deleteBtn);
                    item.appendChild(promptText);
                    item.appendChild(copyBtn);

                    list.appendChild(item);
                });

                const control = document.createElement('div');
                control.className = 'gpt-dropdown-controls';

                const addBtn = document.createElement('button');
                addBtn.className = 'gpt-control-button';
                addBtn.textContent = "Add Prompt";
                addBtn.onclick = () => {
                    const newPrompt = prompt(`Add a new prompt to "${category}"`);
                    if (newPrompt) {
                        prompts[category].push(newPrompt);
                        savePrompts(prompts);
                        refreshList();
                    }
                };

                control.appendChild(addBtn);
                list.appendChild(control);
            }

            button.onclick = () => {
                document.querySelectorAll('.gpt-dropdown-list').forEach(l => {
                    if (l !== list) l.classList.remove('show');
                });
                list.classList.toggle('show');
                refreshList();
            };

            wrapper.appendChild(button);
            wrapper.appendChild(list);
            bar.appendChild(wrapper);
        }

        const devBtn = document.createElement('button');
        devBtn.className = 'gpt-dev-button';
        devBtn.textContent = 'GPT Toolbar Dev';
        devBtn.onclick = () => {
            const existing = document.getElementById('gpt-dev-modal');
            if (existing) {
                existing.remove();
                return;
            }

            const links = getDevLinks();
            const modal = document.createElement('div');
            modal.className = 'gpt-dev-modal';
            modal.id = 'gpt-dev-modal';

            const addLinkBtn = document.createElement('button');
            addLinkBtn.textContent = "➕ Save Current Chat";
            addLinkBtn.className = 'gpt-control-button';
            addLinkBtn.onclick = () => {
                const label = prompt("Enter a name for this chat:");
                const url = location.href;
                if (label && url) {
                    links.push({ label, url });
                    saveDevLinks(links);
                    devBtn.click();
                    devBtn.click();
                }
            };

            modal.appendChild(addLinkBtn);
            links.forEach((link, i) => {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.justifyContent = 'space-between';
                wrapper.style.alignItems = 'center';
                const a = document.createElement('a');
                a.href = link.url;
                a.target = "_blank";
                a.textContent = `🔗 ${link.label}`;
                const del = document.createElement('button');
                del.textContent = "❌";
                del.style.background = "none";
                del.style.color = "#f66";
                del.style.border = "none";
                del.style.cursor = "pointer";
                del.onclick = () => {
                    links.splice(i, 1);
                    saveDevLinks(links);
                    devBtn.click();
                    devBtn.click();
                };
                wrapper.appendChild(a);
                wrapper.appendChild(del);
                modal.appendChild(wrapper);
            });

            document.body.appendChild(modal);
        };
        bar.appendChild(devBtn);

        document.body.appendChild(bar);
        document.body.style.paddingTop = '60px';
    }

    function waitForStablePage(attempts = 0) {
        const triggerElement = document.querySelector('form textarea, div[role="textbox"]');
        if (triggerElement && document.readyState === "complete") {
            setTimeout(() => {
                try {
                    createToolbar();
                } catch (err) {
                    console.warn("Toolbar init error:", err);
                }
            }, 100);
        } else if (attempts < 30) {
            setTimeout(() => waitForStablePage(attempts + 1), 500);
        } else {
            console.warn("GPT Prompt Toolbar: gave up waiting for page load.");
        }
    }

    waitForStablePage();
})();
