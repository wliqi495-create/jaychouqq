(function() {
    if (window.__SpiderUI_V44_Init) return;
    window.__SpiderUI_V44_Init = true;

// =========================================================================
    // === [BLOCK 1: 核心样式与UI模板] ===
    // =========================================================================
    const hostStyle = document.createElement('style');
    hostStyle.innerHTML = `.spider-highlight { outline: 3px solid #ff3b30 !important; outline-offset: -3px; background: rgba(255, 59, 48, 0.15) !important; box-shadow: inset 0 0 0 2000px rgba(255,59,48,0.1) !important; cursor: crosshair !important; transition: all 0.1s; }`;
    document.documentElement.appendChild(hostStyle);

    const host = document.createElement('div');
    host.id = '__spider_ui_host';
    host.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 2147483647 !important; pointer-events: none !important;';
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const svgIcons = {
        close: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        dock: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>',
        clear: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="#ff3b30" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
        edit: '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        magic: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="#007aff" stroke-width="2" fill="none"><path d="M21 16.5l-5.14-5.14-2.83 2.83L18.17 19.33A2 2 0 0 0 21 16.5z"></path><path d="M15 9l-4-4L2 14l4 4z"></path></svg>',
        play: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
        download: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
        copy: '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
        plus: '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        target: '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>'
    };

    const style = document.createElement('style');
    style.innerHTML = `
        :host { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 13px; color: #333; line-height: 1.4; }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; outline: none; list-style: none; }
        #sp_fab { pointer-events: auto; position: fixed !important; right: 20px !important; bottom: 80px !important; width: 48px; height: 48px; background: #007aff; color: #fff; border-radius: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,122,255,0.4); cursor: pointer; transition: 0.2s; z-index: 2147483647; }
        #sp_fab:active { transform: scale(0.9); }
        #sp_panel { pointer-events: auto; position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; max-height: 75vh; background: #f2f2f7; border-radius: 16px 16px 0 0; box-shadow: 0 -5px 20px rgba(0,0,0,0.2); display: none; flex-direction: column; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.3s; z-index: 2147483647; }
        #sp_panel.show { transform: translateY(0); }
        #sp_panel.pos-top { bottom: auto !important; top: 0 !important; transform: translateY(-100%); border-radius: 0 0 16px 16px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); }
        #sp_panel.pos-top.show { transform: translateY(0); }
        #sp_panel.pos-top .sp_header { border-radius: 0 0 16px 16px; padding-top: calc(12px + env(safe-area-inset-top)); }
        #sp_panel.pos-top .sp_body { padding-bottom: 16px; }
        .sp_header { background: #fff; padding: 12px 16px 8px; border-radius: 16px 16px 0 0; }
        .sp_title_bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .sp_title_bar span { font-size: 16px; font-weight: 700; color: #000; }
        .sp_title_bar span.picking { color: #007aff; } 
        .sp_icon_btn { background: #e5e5ea; color: #8e8e93; border: none; height: 28px; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 8px; transition: 0.2s; gap: 4px; font-weight: bold; font-size: 12px; min-width: 28px; }
        .sp_icon_btn:active { background: #d1d1d6; color: #333; }
        .sp_tabs { display: flex; background: #e5e5ea; border-radius: 8px; padding: 2px; }
        .sp_tab { flex: 1; text-align: center; padding: 6px 0; font-size: 13px; font-weight: 600; color: #8e8e93; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .sp_tab.active { background: #fff; color: #000; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .sp_body { flex: 1; overflow-y: auto; padding: 12px 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); scroll-behavior: smooth; max-height: 75vh; }
        #sp_panel.picking-mode .sp_body { max-height: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; margin: 0 !important; opacity: 0 !important; overflow: hidden !important; }
        #sp_panel.picking-mode .sp_tabs { display: none !important; }
        #sp_panel.picking-mode:not(.pos-top) .sp_header { padding-bottom: calc(12px + env(safe-area-inset-bottom)); }
        .sp_status_bar { background: #d1e8ff; color: #007aff; padding: 8px; border-radius: 8px; text-align: center; font-weight: bold; margin-bottom: 12px; display: none; }
        .sp_reuse_bar { display: flex; gap: 16px; margin-bottom: 12px; padding: 8px 12px; background: #fff; border: 1px solid #e5e5ea; border-radius: 8px; align-items: center; }
        .sp_chk_label { font-size: 13px; color: #007aff; display: flex; align-items: center; cursor: pointer; font-weight: bold; }
        .sp_chk_label input[type="checkbox"] { margin: 0 6px 0 0; transform: scale(1.1); accent-color: #007aff; cursor: pointer; }
        .sp_group_title { font-size: 13px; color: #8e8e93; font-weight: bold; margin-bottom: 8px; margin-top: 6px; padding-left: 4px; }
        .sp_task_grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 16px; }
        .sp_task_item { background: #fff; border: 1px solid #e5e5ea; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; cursor: pointer; transition: 0.2s; }
        .sp_task_item.active { border-color: #007aff; background: #e6f2ff; box-shadow: 0 0 0 1px #007aff; }
        .sp_task_name { font-weight: 600; font-size: 13px; margin-bottom: 2px; display: flex; justify-content: space-between; align-items:center; color: #333; }
        .sp_task_item.done .sp_task_name::after { content: '✓'; color: #34c759; font-size: 14px; font-weight: bold; margin-left: 4px; }
        .sp_task_val { font-size: 11px; color: #8e8e93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sp_btn_test { background: #34c759; color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 14px; width: 100%; cursor: pointer; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(52, 199, 89, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .sp_btn_test:active { background: #28a745; }
        .sp_out_header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #c7c7cc; margin-bottom: 8px; }
        .sp_out_tabs { display: flex; gap: 16px; }
        .sp_out_tab { padding: 4px 0; font-size: 13px; font-weight: bold; color: #8e8e93; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; display: flex; align-items: center; gap: 4px; }
        .sp_out_tab.active { color: #007aff; border-bottom-color: #007aff; }
        .sp_action_btns { display: flex; gap: 8px; margin-bottom: 4px; display: none; }
        .sp_copy_btn { background: #007aff; color: #fff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .sp_dl_btn { background: #34c759; }
        .sp_pane { display: none; width: 100%; height: 180px; background: #fff; border: 1px solid #e5e5ea; border-radius: 8px; padding: 8px; font-family: ui-monospace, monospace; font-size: 11px; color: #1c1c1e; overflow-y: auto; resize: none; white-space: pre-wrap; word-break: break-all; }
        .sp_pane.active { display: block; }
        #sp_test_result { background: #1e1e1e; color: #4af626; }

        /* 属性配置弹窗与折叠样式 */
        #sp_dialog_overlay { pointer-events: auto; position: fixed !important; inset: 0 !important; background: rgba(0,0,0,0.5); z-index: 2147483648; display: none; align-items: flex-end; justify-content: center; }
        #sp_dialog_overlay.pos-top { align-items: flex-start; }
        #sp_dialog { width: 100%; background: #f2f2f7; border-radius: 16px 16px 0 0; padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.3s; box-shadow: 0 -5px 20px rgba(0,0,0,0.2); max-height: 92vh; display: flex; flex-direction: column; }
        #sp_dialog.show { transform: translateY(0); }
        #sp_dialog.pos-top { border-radius: 0 0 16px 16px; padding-bottom: 16px; padding-top: calc(16px + env(safe-area-inset-top)); transform: translateY(-100%); box-shadow: 0 5px 20px rgba(0,0,0,0.2); }
        #sp_dialog.pos-top.show { transform: translateY(0); }
        
        #sp_dialog.collapsed { background: transparent; box-shadow: none; pointer-events: none; }
        #sp_dialog.collapsed .sp_dialog_card#sp_dialog_header_card { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); pointer-events: auto; padding-bottom: 12px; }
        #sp_dialog.collapsed .sp_hide_on_collapse { display: none !important; }

        .sp_dialog_card { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 12px; flex-shrink: 0; }
        .sp_current_field_hint { display: inline-block; background: #e6f2ff; color: #007aff; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid #b3d9ff; }
        .sp_path_view { background: #f2f2f7; padding: 8px; border-radius: 6px; font-family: monospace; font-size: 11px; color: #ff9500; word-break: break-all; border: 1px solid #e5e5ea; margin-top: 8px; }
        .sp_attr_list { background: #fff; border-radius: 12px; margin-bottom: 12px; flex-shrink: 1; overflow-y: auto; min-height: 50px; max-height: 30vh; }
        .sp_attr_item { display: flex; padding: 14px 12px; border-bottom: 1px solid #f2f2f7; align-items: center; cursor: pointer; transition: 0.2s; flex-wrap: wrap; }
        .sp_attr_item:last-child { border-bottom: none; }
        .sp_attr_item:active { background: #f9f9f9; }
        .sp_attr_item input[type="radio"] { margin-right: 12px; transform: scale(1.3); accent-color: #007aff; }
        .sp_attr_name { font-weight: bold; width: 80px; font-size: 13px; color: #000; }
        .sp_attr_val { color: #666; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
        #sp_filter_card { flex-shrink: 1; overflow-y: auto; min-height: 80px; max-height: 35vh; display: flex; flex-direction: column; }
        .sp_preset_chip { background: #f2f2f7; color: #007aff; border: none; border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; font-weight:bold; transition:0.2s; display:flex; align-items:center; justify-content:center; }
        .sp_preset_chip:active { background: #e5e5ea; }
        .sp_filter_item { display: flex; gap: 6px; align-items: center; background: #f9f9f9; padding: 8px; border-radius: 8px; border: 1px solid #e5e5ea; flex-shrink:0; }
        .sp_filter_input { flex: 1; border: 1px solid #e5e5ea; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none; background: #fff; color: #333; transition: border-color 0.2s; width: 10px; }
        .sp_filter_input:focus { border-color: #007aff; }
        .sp_magic_btn { background: transparent; border: none; padding: 0; cursor: pointer; position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display:flex; align-items:center; }
        .sp_regex_menu { position: absolute; right: 0; top: calc(100% + 4px); background: #fff; border: 1px solid #e5e5ea; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); z-index: 100; display: none; flex-direction: column; padding: 4px; width: 90px; }
        .sp_regex_menu_item { padding: 8px 12px; font-size: 12px; cursor: pointer; border-radius: 4px; color: #333; transition: background 0.2s; }
        .sp_regex_menu_item:hover, .sp_regex_menu_item:active { background: #f2f2f7; color: #007aff; font-weight: bold; }
        .sp_dialog_btns { display: flex; gap: 10px; flex-shrink: 0; padding-top: 4px; }
        .sp_dialog_btn { flex: 1; padding: 12px; border: none; border-radius: 12px; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.2s; display:flex; justify-content:center; align-items:center; }
        .btn_cancel { background: #e5e5ea; color: #8e8e93; }
        .btn_cancel:active { background: #d1d1d6; color: #333; }
        .btn_confirm { background: #007aff; color: #fff; box-shadow: 0 2px 6px rgba(0,122,255,0.3); }
        .btn_confirm:active { background: #0056b3; }
        .btn_parent { background: #e5e5ea; color: #007aff; padding: 6px 12px; border-radius: 10px; font-size: 13px; border: none; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .btn_parent:active { background: #d1d1d6; }

        /* 树状手风琴筛选专属样式 */
        .sp_flt_class_row { display: flex; gap: 8px; align-items: center; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #e5e5ea; margin-bottom: 8px; }
        .sp_flt_class_input { flex: 1; border: 1px solid #e5e5ea; border-radius: 6px; padding: 6px 8px; font-size: 13px; outline: none; background: #f9f9f9; width: 10px; }
        .sp_flt_class_input:focus { border-color: #007aff; background: #fff; }
        .sp_flt_btn_add { background: #e6f2ff; color: #007aff; border: none; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap; transition: 0.2s; }
        .sp_flt_btn_add:active { background: #cce4ff; }
        .sp_flt_accordion { background: #f2f2f7; padding: 10px; border-radius: 8px; margin: -4px 0 12px 10px; border-left: 3px solid #007aff; display: none; }
        .sp_flt_accordion.open { display: block; }
        .sp_flt_presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .sp_flt_item_row { display: flex; gap: 6px; align-items: center; background: #fff; padding: 8px; border-radius: 8px; border: 1px solid #e5e5ea; margin-bottom: 6px; }
        .sp_flt_btn_pick { background: #f2f2f7; border: 1px solid #e5e5ea; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: bold; color: #333; cursor: pointer; flex-shrink: 0; transition: 0.2s; }
        .sp_flt_btn_pick:active { background: #e5e5ea; }
        .sp_flt_btn_pick.done { color: #34c759; border-color: #34c759; background: #ebf9eb; }
        .sp_flt_btn_del { background: transparent; color: #ff3b30; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
        .sp_flt_btn_del:active { background: #ffe5e5; }
        .sp_flt_btn_batch { background: #ff9500; color: #fff; border: none; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: 0.2s; }
        .sp_flt_btn_batch:active { background: #e08300; }

        @media (min-width: 768px) {
            #sp_panel { width: 600px !important; left: 50% !important; right: auto !important; margin-left: -300px !important; border-radius: 16px 16px 0 0 !important; }
            #sp_panel.pos-top { border-radius: 0 0 16px 16px !important; }
            #sp_dialog { width: 600px !important; border-radius: 16px 16px 0 0 !important; }
            #sp_dialog.pos-top { border-radius: 0 0 16px 16px !important; }
        }
    `;
    shadow.appendChild(style);

    const uiTemplate = document.createElement('div');
    uiTemplate.innerHTML = `
        <div id="sp_fab">配置</div>
        <div id="sp_panel">
            <div class="sp_header">
                <div class="sp_title_bar">
                    <span id="sp_panel_title">Spider 规则构建</span>
                    <div style="display:flex; gap:8px;">
                        <button class="sp_icon_btn" id="sp_btn_manual" title="跳过点选" style="display:none; color:#ff9500; width:auto; padding:0 10px; gap:4px; font-size:12px; font-weight:bold;">${svgIcons.edit} 固定值</button>
                        <button class="sp_icon_btn" id="sp_clear_cache" title="清空配置">${svgIcons.clear}</button>
                        <button class="sp_icon_btn" id="sp_pos_panel" title="切换位置">${svgIcons.dock}</button>
                        <button class="sp_icon_btn" id="sp_close_panel">${svgIcons.close}</button>
                    </div>
                </div>
                <div class="sp_tabs">
                    <div class="sp_tab active" data-tab="global">全局</div>
                    <div class="sp_tab" data-tab="home">推荐</div>
                    <div class="sp_tab" data-tab="category">分类</div>
                    <div class="sp_tab" data-tab="filter">筛选</div>
                    <div class="sp_tab" data-tab="detail">详情</div>
                    <div class="sp_tab" data-tab="search">搜索</div>
                </div>
            </div>
            
            <div class="sp_body" id="sp_panel_body">
                <div class="sp_status_bar" id="sp_status"></div>
                <div class="sp_reuse_bar" id="sp_reuse_bar" style="display:none;"></div>
                <div id="sp_task_container"></div>
                <button class="sp_btn_test" id="sp_run_test">${svgIcons.play} 运行测试 & 生成代码</button>
                <div class="sp_out_header" id="sp_out_header" style="display:none;">
                    <div class="sp_out_tabs">
                        <div class="sp_out_tab active" data-target="sp_test_result">测试结果</div>
                        <div class="sp_out_tab" id="sp_tab_code" data-target="sp_code_output">方法代码</div>
                    </div>
                    <div class="sp_action_btns" id="sp_action_btns">
                        <button class="sp_copy_btn sp_dl_btn" id="sp_dl_btn">${svgIcons.download} 下载 .js</button>
                        <button class="sp_copy_btn" id="sp_copy_btn">${svgIcons.copy} 复制</button>
                    </div>
                </div>
                <pre id="sp_test_result" class="sp_pane active" style="display:none;">等待测试...</pre>
                <textarea id="sp_code_output" class="sp_pane" readonly style="display:none;"></textarea>
            </div>
        </div>

        <div id="sp_dialog_overlay">
            <div id="sp_dialog">
                <div class="sp_dialog_card" id="sp_dialog_header_card" style="margin-bottom:12px; transition:0.3s;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span id="sp_dialog_title" style="font-size:15px; font-weight:bold; color:#333; display:block; margin-bottom:6px;">配置属性</span>
                            <div class="sp_current_field_hint" id="sp_field_hint"></div>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <button class="btn_parent" id="sp_btn_restore" style="display:none; background:#34c759; color:#fff;">恢复面板</button>
                            <button class="btn_parent" id="sp_btn_child_node">缩小</button>
                            <button class="btn_parent" id="sp_btn_parent_node">放大</button>
                            <button class="sp_icon_btn" id="sp_pos_dialog" style="height:26px; width:26px; border-radius:8px; margin-left:4px;">${svgIcons.dock}</button>
                        </div>
                    </div>
                    <div id="sp_path_wrap" class="sp_hide_on_collapse">
                        <div id="sp_path_controls" style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; margin-bottom:4px;">
                            <span style="font-size:11px; color:#8e8e93; font-weight:bold;">元素路径</span>
                            <label class="sp_chk_label"><input type="checkbox" id="sp_chk_absolute"> 绝对定位匹配</label>
                        </div>
                        <div class="sp_path_view" id="sp_css_path"></div>
                    </div>
                </div>
                
                <div class="sp_attr_list sp_hide_on_collapse" id="sp_attr_container"></div>
                
                <div class="sp_dialog_card sp_hide_on_collapse" id="sp_filter_card" style="display:none; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #e5e5ea;">
                        <span style="font-size:13px; font-weight:bold; color:#333;">数据清洗附加处理</span>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; flex-shrink:0;">
                        <button class="sp_preset_chip" id="sp_btn_add_replace">+ 替换</button>
                        <button class="sp_preset_chip" id="sp_btn_add_split">+ 分割</button>
                        <button class="sp_preset_chip" id="sp_btn_add_between">+ 取中间</button>
                        <button class="sp_preset_chip" id="sp_btn_add_regex">+ 正则</button>
                        <button class="sp_preset_chip" id="sp_btn_add_urldecode">+ URL解码</button>
                        <button class="sp_preset_chip" id="sp_btn_add_nospace">+ 去空白</button>
                        <button class="sp_preset_chip" id="sp_btn_add_prepend">+ 前缀</button>
                        <button class="sp_preset_chip" id="sp_btn_add_append">+ 后缀</button>
                        <button class="sp_preset_chip" id="sp_btn_add_nohtml">+ 去HTML</button>
                    </div>
                    <div id="sp_filter_list" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>

                <div class="sp_dialog_btns sp_hide_on_collapse">
                    <button class="sp_dialog_btn" id="sp_btn_reselect" style="display:none; background:#ff3b30; color:#fff; flex: 0.6;">重选</button>
                    <button class="sp_dialog_btn btn_cancel" id="sp_btn_cancel">取消</button>
                    <button class="sp_dialog_btn btn_confirm" id="sp_btn_confirm">保存配置</button>
                </div>
            </div>
        </div>
    `;
    shadow.appendChild(uiTemplate);

    const UI = {
        fab: shadow.querySelector('#sp_fab'), panel: shadow.querySelector('#sp_panel'), panelBody: shadow.querySelector('#sp_panel_body'),
        panelTitle: shadow.querySelector('#sp_panel_title'), taskContainer: shadow.querySelector('#sp_task_container'), tabs: shadow.querySelectorAll('.sp_tab'),
        statusBar: shadow.querySelector('#sp_status'), codeOutput: shadow.querySelector('#sp_code_output'),
        dialogOverlay: shadow.querySelector('#sp_dialog_overlay'), dialogBox: shadow.querySelector('#sp_dialog'),
        attrContainer: shadow.querySelector('#sp_attr_container'), cssPath: shadow.querySelector('#sp_css_path'),
        pathControls: shadow.querySelector('#sp_path_controls'), btnParentNode: shadow.querySelector('#sp_btn_parent_node'), btnChildNode: shadow.querySelector('#sp_btn_child_node'),
        chkAbsolute: shadow.querySelector('#sp_chk_absolute'), btnReselect: shadow.querySelector('#sp_btn_reselect'), btnClearCache: shadow.querySelector('#sp_clear_cache'),
        btnManual: shadow.querySelector('#sp_btn_manual'), testResult: shadow.querySelector('#sp_test_result'), outHeader: shadow.querySelector('#sp_out_header'), 
        outTabs: shadow.querySelectorAll('.sp_out_tab'), copyBtn: shadow.querySelector('#sp_copy_btn'), downloadBtn: shadow.querySelector('#sp_dl_btn'), actionBtns: shadow.querySelector('#sp_action_btns'),
        tabCodeText: shadow.querySelector('#sp_tab_code'), reuseBar: shadow.querySelector('#sp_reuse_bar'), fieldHint: shadow.querySelector('#sp_field_hint'),
        btnPosPanel: shadow.querySelector('#sp_pos_panel'), btnPosDialog: shadow.querySelector('#sp_pos_dialog'), filterCard: shadow.querySelector('#sp_filter_card'), filterList: shadow.querySelector('#sp_filter_list'),
        dialogTitle: shadow.querySelector('#sp_dialog_title'), btnRestore: shadow.querySelector('#sp_btn_restore')
    };

    // =========================================================================
    // === [BLOCK 2: 状态管理与本地缓存] ===
    // =========================================================================
    const TAB_SCHEMAS = {
        home: { isList: true, fields: [{ id:'container', name:'卡片容器', isBatch: true }, { id:'vod_name', name:'标题' }, { id:'vod_pic', name:'图片' }, { id:'vod_id', name:'链接' }, { id:'vod_remarks', name:'备注' }] },
        category: { isList: true, fields: [{ id:'container', name:'卡片容器', isBatch: true }, { id:'vod_name', name:'标题' }, { id:'vod_pic', name:'图片' }, { id:'vod_id', name:'链接' }, { id:'vod_remarks', name:'备注' }, { id:'pagecount', name:'总页数', global:true }, { id:'limit', name:'每页数量', global:true }, { id:'total', name:'总记录数', global:true }] },
        detail: { isList: false, fields: [{ id:'vod_name', name:'名称' }, { id:'vod_pic', name:'海报' }, { id:'vod_year', name:'年份' }, { id:'vod_director', name:'导演' }, { id:'vod_actor', name:'主演' }, { id:'vod_content', name:'简介' }, { id:'vod_play_from', name:'线路名称', isPlay: true, isBatch: true }, { id:'vod_play_title', name:'剧集标题', isPlay: true, isBatch: true }, { id:'vod_play_url', name:'播放链接', isPlay: true, isBatch: true }] }
    };
    TAB_SCHEMAS.search = TAB_SCHEMAS.category;

    let currentTab = 'global', currentPickingFieldId = null, currentElement = null, tempExtraction = null, elementHistory = [];
    let isPosTop = false, useAbsoluteSelector = false; 
    let currentFilterPicking = null; // 格式: { classIdx: 0, filterIdx: 0, type: 'n'|'v' }
    
    let spiderConfig = { 
        global: { base: window.location.origin, home: '', category: '', cat_pg1: false, detail: '', search: '', search_pg1: false },
        home:{}, category:{}, detail:{}, search:{},
        filter: {
            list: [
                { name: '电影', val: '', expand: true, items: [] },
                { name: '剧集', val: '', expand: false, items: [] },
                { name: '动漫', val: '', expand: false, items: [] },
                { name: '综艺', val: '', expand: false, items: [] },
                { name: '短剧', val: '', expand: false, items: [] }
            ]
        }
    };
    
    Object.keys(TAB_SCHEMAS).forEach(t => {
        spiderConfig[t].container = { sel:'', node:null };
        TAB_SCHEMAS[t].fields.forEach(f => { if(f.id!=='container') spiderConfig[t][f.id] = { sel:'', extract:null, node:null }; });
    });

    function saveConfig() {
        try {
            const cacheObj = { currentTab, isPosTop, data: {}, globalConfig: spiderConfig.global, filterConfig: spiderConfig.filter };
            ['home', 'category', 'detail', 'search'].forEach(t => {
                cacheObj.data[t] = { _reuse: spiderConfig[t]._reuse };
                TAB_SCHEMAS[t].fields.forEach(f => {
                    if (spiderConfig[t][f.id]) cacheObj.data[t][f.id] = { sel: spiderConfig[t][f.id].sel, extract: spiderConfig[t][f.id].extract };
                });
            });
            localStorage.setItem('__SpiderUI_Cache', JSON.stringify(cacheObj));
        } catch(e) {}
    }

    function loadConfig() {
        try {
            const cacheRaw = localStorage.getItem('__SpiderUI_Cache');
            if (cacheRaw) {
                const cache = JSON.parse(cacheRaw);
                if (cache.currentTab && (TAB_SCHEMAS[cache.currentTab] || cache.currentTab === 'global' || cache.currentTab === 'filter')) currentTab = cache.currentTab;
                if (typeof cache.isPosTop === 'boolean') isPosTop = cache.isPosTop;
                if (cache.globalConfig) { spiderConfig.global = cache.globalConfig; if (!spiderConfig.global.base) spiderConfig.global.base = window.location.origin; }
                if (cache.filterConfig && cache.filterConfig.list) { spiderConfig.filter = cache.filterConfig; }

                ['home', 'category', 'detail', 'search'].forEach(t => {
                    if (spiderConfig[t] && cache.data[t]) {
                        spiderConfig[t]._reuse = cache.data[t]._reuse;
                        TAB_SCHEMAS[t].fields.forEach(f => {
                            if (cache.data[t][f.id]) {
                                spiderConfig[t][f.id].sel = cache.data[t][f.id].sel || '';
                                spiderConfig[t][f.id].extract = cache.data[t][f.id].extract || null;
                                if (f.id === 'container' && spiderConfig[t][f.id].sel) { try { spiderConfig[t][f.id].node = document.querySelector(spiderConfig[t][f.id].sel); } catch(e) {} }
                            }
                        });
                    }
                });
            }
        } catch(e) {}
    }

    function copyConfig(srcTab, destTab) {
        const src = spiderConfig[srcTab]; const dest = spiderConfig[destTab];
        TAB_SCHEMAS[destTab].fields.forEach(f => {
            if (src[f.id]) {
                dest[f.id].sel = src[f.id].sel;
                if (f.id === 'container') { try { dest[f.id].node = src[f.id].sel ? document.querySelector(src[f.id].sel) : null; } catch(e) {} } 
                else { dest[f.id].extract = src[f.id].extract ? JSON.parse(JSON.stringify(src[f.id].extract)) : null; }
            }
        });
        saveConfig(); renderTaskList();
    }
    loadConfig();

    // =========================================================================
    // === [BLOCK 3: 树状筛选专享渲染引擎] ===
    // =========================================================================
    function renderFilterTab() {
        UI.reuseBar.style.display = 'none';
        let html = `<div class="sp_group_title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>大类与筛选提取 (树状结构)</span><button class="sp_flt_btn_add" id="sp_flt_add_class">${svgIcons.plus} 添加分类</button>
        </div>`;
        
        spiderConfig.filter.list.forEach((cls, cIdx) => {
            html += `
            <div class="sp_flt_class_row">
                <input type="text" class="sp_flt_class_input fc_name" data-cidx="${cIdx}" placeholder="分类名(如:电影)" value="${cls.name}">
                <input type="text" class="sp_flt_class_input fc_val" data-cidx="${cIdx}" placeholder="分类值(留空则不生成筛选)" value="${cls.val}">
                <button class="sp_flt_btn_del f_del_class" data-cidx="${cIdx}" title="删除此分类">${svgIcons.clear}</button>
                <button class="sp_flt_btn_add f_toggle_exp" data-cidx="${cIdx}">${svgIcons.plus} 筛选</button>
            </div>
            <div class="sp_flt_accordion ${cls.expand ? 'open' : ''}">
                <div class="sp_flt_presets">
                    <button class="sp_flt_btn_batch f_batch_sniff" data-cidx="${cIdx}">${svgIcons.target} 点选页面维度名，批量生成</button>
                    <div style="flex:1;"></div>
                    <span style="font-size:11px; color:#8e8e93; margin-right:4px; display:flex; align-items:center;">添加维度:</span>
                    <button class="sp_preset_chip f_add_item" data-cidx="${cIdx}" data-key="cate" data-name="剧情">+剧情</button>
                    <button class="sp_preset_chip f_add_item" data-cidx="${cIdx}" data-key="type" data-name="类型">+类型</button>
                    <button class="sp_preset_chip f_add_item" data-cidx="${cIdx}" data-key="area" data-name="地区">+地区</button>
                    <button class="sp_preset_chip f_add_item" data-cidx="${cIdx}" data-key="year" data-name="年份">+年份</button>
                    <button class="sp_preset_chip f_add_item" data-cidx="${cIdx}" data-key="lang" data-name="语言">+语言</button>
                    <button class="sp_preset_chip f_add_item" data-cidx="${cIdx}" data-key="letter" data-name="字母">+字母</button>
                    <button class="sp_preset_chip f_add_item" data-cidx="${cIdx}" data-key="by" data-name="排序">+排序</button>
                </div>`;
            
            cls.items.forEach((flt, fIdx) => {
                let nDone = flt.n && flt.n.sel ? 'done' : ''; let vDone = flt.v && flt.v.sel ? 'done' : '';
                html += `
                <div class="sp_flt_item_row">
                    <input type="text" class="sp_flt_class_input fi_key" data-cidx="${cIdx}" data-fidx="${fIdx}" placeholder="Key" value="${flt.key}" style="width:45px; flex:none;">
                    <input type="text" class="sp_flt_class_input fi_name" data-cidx="${cIdx}" data-fidx="${fIdx}" placeholder="维度名" value="${flt.name}" style="width:60px;">
                    <button class="sp_flt_btn_pick f_pick_n ${nDone}" data-cidx="${cIdx}" data-fidx="${fIdx}">选名 ${nDone?'✓':''}</button>
                    <button class="sp_flt_btn_pick f_pick_v ${vDone}" data-cidx="${cIdx}" data-fidx="${fIdx}">选值 ${vDone?'✓':''}</button>
                    <div style="flex:1;"></div>
                    <button class="sp_flt_btn_del f_del_item" data-cidx="${cIdx}" data-fidx="${fIdx}">${svgIcons.clear}</button>
                </div>`;
            });
            html += `</div>`;
        });
        
        UI.taskContainer.innerHTML = html;
        bindFilterEvents();
    }

    let currentBatchSniff = null; // 格式: { classIdx: 0 }

    function bindFilterEvents() {
        shadow.querySelector('#sp_flt_add_class').onclick = () => { spiderConfig.filter.list.push({ name: '', val: '', expand: true, items: [] }); saveConfig(); renderFilterTab(); };
        shadow.querySelectorAll('.fc_name').forEach(el => el.oninput = (e) => { spiderConfig.filter.list[e.target.dataset.cidx].name = e.target.value; saveConfig(); });
        shadow.querySelectorAll('.fc_val').forEach(el => el.oninput = (e) => { spiderConfig.filter.list[e.target.dataset.cidx].val = e.target.value; saveConfig(); });
        shadow.querySelectorAll('.f_del_class').forEach(btn => btn.onclick = (e) => { if(confirm('[警告] 确定删除此分类及下方所有筛选吗？')){ spiderConfig.filter.list.splice(e.target.closest('button').dataset.cidx, 1); saveConfig(); renderFilterTab(); } });
        shadow.querySelectorAll('.f_toggle_exp').forEach(btn => btn.onclick = (e) => { let cIdx = e.target.closest('button').dataset.cidx; spiderConfig.filter.list[cIdx].expand = !spiderConfig.filter.list[cIdx].expand; saveConfig(); renderFilterTab(); });
        
        // 快捷预置：不再新建，而是新建后直接显示
        shadow.querySelectorAll('.f_add_item').forEach(btn => btn.onclick = (e) => { spiderConfig.filter.list[e.target.dataset.cidx].items.push({ key: e.target.dataset.key, name: e.target.dataset.name, n: null, v: null }); saveConfig(); renderFilterTab(); });
        
        shadow.querySelectorAll('.fi_key').forEach(el => el.oninput = (e) => { spiderConfig.filter.list[e.target.dataset.cidx].items[e.target.dataset.fidx].key = e.target.value; saveConfig(); });
        shadow.querySelectorAll('.fi_name').forEach(el => el.oninput = (e) => { spiderConfig.filter.list[e.target.dataset.cidx].items[e.target.dataset.fidx].name = e.target.value; saveConfig(); });
        shadow.querySelectorAll('.f_del_item').forEach(btn => btn.onclick = (e) => { let b = e.target.closest('button'); spiderConfig.filter.list[b.dataset.cidx].items.splice(b.dataset.fidx, 1); saveConfig(); renderFilterTab(); });

        // 🎯 批量嗅探维度绑定
        shadow.querySelectorAll('.f_batch_sniff').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation();
            let cIdx = btn.dataset.cidx;
            currentBatchSniff = { classIdx: cIdx };
            UI.statusBar.style.display = 'none';
            UI.panelTitle.textContent = `[${spiderConfig.filter.list[cIdx].name}] - 请在页面点击任意维度名(如:按剧情)`;
            UI.panelTitle.classList.add('picking'); UI.panel.classList.add('picking-mode'); UI.panel.style.cursor = 'pointer';
            togglePicking(true);
        });

        shadow.querySelectorAll('.f_pick_n, .f_pick_v').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation();
            let isN = btn.classList.contains('f_pick_n'); let cIdx = btn.dataset.cidx, fIdx = btn.dataset.fidx;
            let targetObj = spiderConfig.filter.list[cIdx].items[fIdx][isN ? 'n' : 'v'];
            currentFilterPicking = { classIdx: cIdx, filterIdx: fIdx, type: isN ? 'n' : 'v' };
            
            if (targetObj && targetObj.sel) {
                useAbsoluteSelector = true; 
                try { currentElement = document.querySelector(targetObj.sel); } catch(e){ currentElement = null;}
                tempExtraction = { type: targetObj.extract.type, val: targetObj.extract.val||'', key: targetObj.extract.key||'', sel: targetObj.sel, filters: targetObj.extract.filters ? JSON.parse(JSON.stringify(targetObj.extract.filters)) : [] };
                openDialog(true);
            } else {
                useAbsoluteSelector = true; tempExtraction = null; UI.statusBar.style.display = 'none';
                UI.panelTitle.textContent = `提取 [${spiderConfig.filter.list[cIdx].name}] - ${spiderConfig.filter.list[cIdx].items[fIdx].name} (${isN?'选名':'选值'})`;
                UI.panelTitle.classList.add('picking'); UI.panel.classList.add('picking-mode'); UI.panel.style.cursor = 'pointer';
                togglePicking(true);
            }
        });
    }

    // =========================================================================
    // === [BLOCK 4: 基础视图与交互逻辑] ===
    // =========================================================================
    UI.btnClearCache.onclick = () => { if(confirm('[警告] 确定要清空所有已配置的规则缓存吗？')) { localStorage.removeItem('__SpiderUI_Cache'); location.reload(); } };
    function applyPositionMode() { if (isPosTop) { UI.panel.classList.add('pos-top'); UI.dialogOverlay.classList.add('pos-top'); UI.dialogBox.classList.add('pos-top'); } else { UI.panel.classList.remove('pos-top'); UI.dialogOverlay.classList.remove('pos-top'); UI.dialogBox.classList.remove('pos-top'); } }
    function togglePosition(e) { if(e) e.stopPropagation(); isPosTop = !isPosTop; saveConfig(); applyPositionMode(); }
    UI.btnPosPanel.onclick = togglePosition; UI.btnPosDialog.onclick = togglePosition; applyPositionMode(); 
    function resetPanelTitle() { UI.panelTitle.textContent = 'Spider 规则构建'; UI.panelTitle.classList.remove('picking'); UI.btnManual.style.display = 'none'; }

    function renderTaskList() {
        if (currentTab === 'global') {
            UI.reuseBar.style.display = 'none';
            let conf = spiderConfig.global;
            let html = `
                <div class="sp_group_title">基础环境</div>
                <div class="sp_dialog_card" style="padding: 12px; margin-bottom: 12px;">
                    <div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:bold;">根域名 (BASE)</span></div>
                    <input type="text" id="cfg_base" placeholder="如: https://www.example.com" class="sp_filter_input" style="width:100%; font-size:13px;" value="${conf.base || ''}">
                </div>
                <div class="sp_group_title">引擎路由宏模板</div>
                <div class="sp_dialog_card" style="padding: 12px; margin-bottom: 12px;">
                    <div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:bold;">首页路由 (homeContent)</span></div>
                    <input type="text" id="cfg_home" placeholder="如: {BASE}/api/home" class="sp_filter_input" style="width:100%; margin-bottom:8px;" value="${conf.home || ''}">
                    <div style="display:flex; gap:6px;"><button class="sp_preset_chip cfg_mac" data-target="cfg_home" data-val="{BASE}">+{BASE}</button></div>
                </div>
                <div class="sp_dialog_card" style="padding: 12px; margin-bottom: 12px;">
                    <div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:bold;">分类路由 (categoryContent)</span></div>
                    <input type="text" id="cfg_category" placeholder="如: {BASE}/vod/show/id/{tid}/page/{pg}.html" class="sp_filter_input" style="width:100%; margin-bottom:8px;" value="${conf.category || ''}">
                    <div style="display:flex; gap:6px; margin-bottom:8px;"><button class="sp_preset_chip cfg_mac" data-target="cfg_category" data-val="{BASE}">+{BASE}</button><button class="sp_preset_chip cfg_mac" data-target="cfg_category" data-val="{tid}">+{tid} 分类</button><button class="sp_preset_chip cfg_mac" data-target="cfg_category" data-val="{pg}">+{pg} 页码</button></div>
                    <label class="sp_chk_label"><input type="checkbox" id="cfg_cat_pg1" ${conf.cat_pg1 ? 'checked' : ''}> 第一页清理分页后缀</label>
                </div>
                <div class="sp_dialog_card" style="padding: 12px; margin-bottom: 12px;">
                    <div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:bold;">详情路由 (detailContent)</span></div>
                    <input type="text" id="cfg_detail" placeholder="如: {BASE}/vod/detail/id/{id}.html" class="sp_filter_input" style="width:100%; margin-bottom:8px;" value="${conf.detail || ''}">
                    <div style="display:flex; gap:6px;"><button class="sp_preset_chip cfg_mac" data-target="cfg_detail" data-val="{BASE}">+{BASE}</button><button class="sp_preset_chip cfg_mac" data-target="cfg_detail" data-val="{id}">+{id} 视频ID</button></div>
                </div>
                <div class="sp_dialog_card" style="padding: 12px; margin-bottom: 12px;">
                    <div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:bold;">搜索路由 (searchContent)</span></div>
                    <input type="text" id="cfg_search" placeholder="如: {BASE}/search/{wd}----------{pg}---.html" class="sp_filter_input" style="width:100%; margin-bottom:8px;" value="${conf.search || ''}">
                    <div style="display:flex; gap:6px; margin-bottom:8px;"><button class="sp_preset_chip cfg_mac" data-target="cfg_search" data-val="{BASE}">+{BASE}</button><button class="sp_preset_chip cfg_mac" data-target="cfg_search" data-val="{wd}">+{wd} 搜索词</button><button class="sp_preset_chip cfg_mac" data-target="cfg_search" data-val="{pg}">+{pg} 页码</button></div>
                    <label class="sp_chk_label"><input type="checkbox" id="cfg_search_pg1" ${conf.search_pg1 ? 'checked' : ''}> 第一页清理分页后缀</label>
                </div>`;
            UI.taskContainer.innerHTML = html;
            const bindInput = (id, key) => { const el = shadow.querySelector('#'+id); if(el) el.oninput = (e) => { spiderConfig.global[key] = e.target.value; saveConfig(); }; };
            const bindCheck = (id, key) => { const el = shadow.querySelector('#'+id); if(el) el.onchange = (e) => { spiderConfig.global[key] = e.target.checked; saveConfig(); }; };
            bindInput('cfg_base', 'base'); bindInput('cfg_home', 'home'); bindInput('cfg_category', 'category'); bindCheck('cfg_cat_pg1', 'cat_pg1'); bindInput('cfg_detail', 'detail'); bindInput('cfg_search', 'search'); bindCheck('cfg_search_pg1', 'search_pg1');
            shadow.querySelectorAll('.cfg_mac').forEach(btn => { btn.onclick = (e) => { const input = shadow.querySelector('#' + e.target.dataset.target); if (input) { const val = e.target.dataset.val; const start = input.selectionStart; input.value = input.value.slice(0, start) + val + input.value.slice(input.selectionEnd); input.dispatchEvent(new Event('input')); input.focus(); input.selectionStart = input.selectionEnd = start + val.length; } }; });
            return; 
        }

        if (currentTab === 'filter') { renderFilterTab(); return; }

        const schema = TAB_SCHEMAS[currentTab], conf = spiderConfig[currentTab];
        UI.reuseBar.style.display = 'none';

        if (currentTab === 'category') {
            UI.reuseBar.style.display = 'flex';
            UI.reuseBar.innerHTML = `<label class="sp_chk_label"><input type="checkbox" id="chk_reuse_home" ${conf._reuse === 'home' ? 'checked' : ''}> 复用推荐配置</label>`;
            shadow.querySelector('#chk_reuse_home').onchange = (e) => { if (e.target.checked) { conf._reuse = 'home'; copyConfig('home', 'category'); } else { conf._reuse = null; clearConfig('category'); saveConfig(); renderTaskList(); } };
        } else if (currentTab === 'search') {
            UI.reuseBar.style.display = 'flex';
            UI.reuseBar.innerHTML = `<label class="sp_chk_label" style="margin-right:12px;"><input type="checkbox" id="chk_reuse_home_s" ${conf._reuse === 'home' ? 'checked' : ''}> 复用推荐</label><label class="sp_chk_label"><input type="checkbox" id="chk_reuse_cat_s" ${conf._reuse === 'category' ? 'checked' : ''}> 复用分类</label>`;
            shadow.querySelector('#chk_reuse_home_s').onchange = (e) => { if (e.target.checked) { conf._reuse = 'home'; shadow.querySelector('#chk_reuse_cat_s').checked = false; copyConfig('home', 'search'); } else { conf._reuse = null; clearConfig('search'); saveConfig(); renderTaskList(); } };
            shadow.querySelector('#chk_reuse_cat_s').onchange = (e) => { if (e.target.checked) { conf._reuse = 'category'; shadow.querySelector('#chk_reuse_home_s').checked = false; copyConfig('category', 'search'); } else { conf._reuse = null; clearConfig('search'); saveConfig(); renderTaskList(); } };
        }

        let htmlList = schema.isList ? '<div class="sp_group_title">列表字段</div><div class="sp_task_grid">' : '<div class="sp_group_title">基础字段</div><div class="sp_task_grid">';
        let htmlGlobal = schema.isList ? '<div class="sp_group_title" style="margin-top:12px;">全局字段</div><div class="sp_task_grid">' : '';
        let htmlPlay = !schema.isList && currentTab === 'detail' ? '<div class="sp_group_title" style="margin-top:12px;">播放列表</div><div class="sp_task_grid">' : '';
        let hasGlobal = false; let hasPlay = false;

        schema.fields.forEach(f => {
            let isDone = f.id === 'container' ? !!conf[f.id].sel : !!(conf[f.id] && conf[f.id].extract);
            let activeClass = currentPickingFieldId === f.id ? 'active' : '';
            let itemHtml = `<div class="sp_task_item ${isDone ? 'done' : ''} ${activeClass}" data-id="${f.id}"><div class="sp_task_name">${f.name}</div><div class="sp_task_val">${isDone ? '已配置' : '未配置'}</div></div>`;
            if (f.global) { htmlGlobal += itemHtml; hasGlobal = true; } else if (f.isPlay) { htmlPlay += itemHtml; hasPlay = true; } else { htmlList += itemHtml; }
        });
        UI.taskContainer.innerHTML = htmlList + '</div>' + (hasGlobal ? htmlGlobal + '</div>' : '') + (hasPlay ? htmlPlay + '</div>' : '');

        shadow.querySelectorAll('.sp_task_item').forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation(); 
                const fId = item.dataset.id, fSchema = schema.fields.find(x => x.id === fId);
                const isDone = item.classList.contains('done');
                if (schema.isList && fId !== 'container' && !fSchema.global && !conf.container.sel) { alert('[提示] 请先设定【卡片容器】！'); return; }
                currentPickingFieldId = fId; renderTaskList();
                if (isDone) {
                    let savedSel = conf[fId].sel || ''; useAbsoluteSelector = savedSel.includes('nth-of-type') || !fSchema.isBatch;
                    let targetEl = null;
                    if (fId === 'container') { try { targetEl = document.querySelector(savedSel); } catch(e){} } 
                    else { let base = document; if (schema.isList && !fSchema.global && conf.container.node) base = conf.container.node; try { targetEl = savedSel ? base.querySelector(savedSel) : base; } catch(e){} }
                    currentElement = targetEl; 
                    if (fId === 'container') { tempExtraction = { type: 'container', absSel: savedSel }; } 
                    else { tempExtraction = { type: conf[fId].extract.type, val: conf[fId].extract.val || '', key: conf[fId].extract.key || '', sel: savedSel, filters: conf[fId].extract.filters ? JSON.parse(JSON.stringify(conf[fId].extract.filters)) : [] }; }
                    openDialog(true); 
                } else {
                    useAbsoluteSelector = !fSchema.isBatch; tempExtraction = null; UI.statusBar.style.display = 'none'; 
                    UI.panelTitle.textContent = `Spider 规则构建 - ${fSchema.name}`; UI.panelTitle.classList.add('picking');
                    UI.btnManual.style.display = 'flex'; UI.panel.classList.add('picking-mode'); UI.panel.style.cursor = 'pointer'; 
                    togglePicking(true);
                }
            };
        });
    }

    UI.btnManual.onclick = (e) => { e.stopPropagation(); togglePicking(false); UI.btnManual.style.display = 'none'; currentElement = null; tempExtraction = { type: 'custom', key: '', val: '', sel: '', filters: [] }; openDialog(true); };
    
    UI.tabs.forEach(tab => { 
        tab.onclick = () => { 
            UI.tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); currentTab = tab.dataset.tab; 
            currentPickingFieldId = null; currentFilterPicking = null;
            togglePicking(false); UI.statusBar.style.display = 'none'; resetPanelTitle(); saveConfig(); 
            UI.panel.classList.remove('picking-mode'); UI.panel.style.cursor = 'default';
            if (currentTab === 'filter') renderFilterTab(); else renderTaskList(); 
        }; 
    });
    
    UI.outTabs.forEach(tab => { 
        tab.onclick = () => { 
            UI.outTabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); const targetId = tab.dataset.target; 
            UI.testResult.style.display = 'none'; UI.codeOutput.style.display = 'none'; UI.testResult.classList.remove('active'); UI.codeOutput.classList.remove('active'); 
            const targetPane = shadow.querySelector('#' + targetId); targetPane.style.display = 'block'; setTimeout(() => targetPane.classList.add('active'), 10); 
            if (targetId === 'sp_code_output') { UI.actionBtns.style.display = 'flex'; } else { UI.actionBtns.style.display = 'none'; } 
        }; 
    });

    UI.copyBtn.onclick = () => { const code = UI.codeOutput.value; if(!code) return alert('[提示] 没有可复制的代码！'); if(navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(code).then(() => { let oldHTML = UI.copyBtn.innerHTML; UI.copyBtn.innerHTML = '[成功]'; setTimeout(() => UI.copyBtn.innerHTML = oldHTML, 1500); }); } else { UI.codeOutput.select(); document.execCommand('copy'); let oldHTML = UI.copyBtn.innerHTML; UI.copyBtn.innerHTML = '[成功]'; setTimeout(() => UI.copyBtn.innerHTML = oldHTML, 1500); } };
    UI.downloadBtn.onclick = () => { const code = UI.codeOutput.value; if(!code) return alert('[提示] 没有可导出的代码！'); const blob = new Blob([code], { type: 'text/javascript' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'spider_rule.js'; a.click(); URL.revokeObjectURL(url); };

// =========================================================================
    // === [BLOCK 5: 核心选择器算法与数据清洗] ===
    // =========================================================================
    const handleEvent = (e) => {
        if (e.composedPath().includes(host)) return; 
        if (e.type === 'mouseover' || e.type === 'touchstart') e.target.classList.add('spider-highlight');
        else if (e.type === 'mouseout' || e.type === 'touchend') e.target.classList.remove('spider-highlight');
        else if (e.type === 'click') {
            e.preventDefault(); e.stopPropagation();

            // [新增] 🎯 批量嗅探维度的捕获逻辑
            if (currentBatchSniff) {
                let cIdx = currentBatchSniff.classIdx;
                let absPath = getSelector(e.target, null, true); // 获取点击元素的纯绝对路径
                let parts = absPath.split(' > ');
                
                // 核心：寻找倒数第一个可以泛化的结构层 (如 ul, dl, div.row 的 nth-of-type)
                let genIdx = -1;
                for(let i = 0; i < parts.length; i++) {
                    if(parts[i].includes(':nth-of-type')) { genIdx = i; break; }
                }
                
                if (genIdx === -1) {
                    alert('[提示] 未找到平级的列表结构规律，请手动添加维度。');
                    togglePicking(false); currentBatchSniff = null; resetPanelTitle();
                    UI.panel.classList.remove('picking-mode'); UI.panel.style.cursor = 'default';
                    renderFilterTab(); return;
                }

                // 剥离 nth-of-type 实现全域匹配
                let genTag = parts[genIdx].split(':')[0]; 
                parts[genIdx] = genTag; 
                let genSel = parts.join(' > ');
                
                let nodes = document.querySelectorAll(genSel);
                let batchId = Date.now().toString(); // 为这批兄弟维度打上共同烙印
                let newItems = [];
                
                nodes.forEach((node, i) => {
                    let text = node.textContent.replace(/[:：\s]/g, '').trim();
                    if(!text) return;
                    
                    // 智能倒推 Key
                    let inferredKey = 'key_' + i;
                    if (text.includes('类') || text.includes('型')) inferredKey = 'class';
                    else if (text.includes('剧')) inferredKey = 'cate';
                    else if (text.includes('区')) inferredKey = 'area';
                    else if (text.includes('年')) inferredKey = 'year';
                    else if (text.includes('语')) inferredKey = 'lang';
                    else if (text.includes('字')) inferredKey = 'letter';
                    else if (text.includes('排')) inferredKey = 'by';

                    // 向上回溯，找出这个维度对应的父级绝对基准路径 (用于未来的单点同步)
                    let curr = node;
                    while(curr && curr.tagName.toLowerCase() !== genTag) { curr = curr.parentElement; }
                    let baseSel = curr ? getSelector(curr, null, true) : '';

                    newItems.push({ key: inferredKey, name: text, n: null, v: null, baseSel: baseSel, batchId: batchId });
                });

                if (newItems.length > 0) {
                    spiderConfig.filter.list[cIdx].items = spiderConfig.filter.list[cIdx].items.concat(newItems);
                    saveConfig();
                    // 这里可以放一个轻提示，但原生 alert 会打断体验，所以静默刷新界面即可
                } else {
                    alert('[提示] 未能嗅探到有效的兄弟节点。');
                }
                
                togglePicking(false); currentBatchSniff = null; resetPanelTitle();
                UI.panel.classList.remove('picking-mode'); UI.panel.style.cursor = 'default';
                renderFilterTab(); return;
            }

            let baseNode = document;
            if (!currentFilterPicking && currentTab !== 'filter' && TAB_SCHEMAS[currentTab].isList && currentPickingFieldId !== 'container') {
                let fSchema = TAB_SCHEMAS[currentTab].fields.find(x => x.id === currentPickingFieldId);
                if (!fSchema.global && spiderConfig[currentTab].container && spiderConfig[currentTab].container.node) baseNode = spiderConfig[currentTab].container.node;
            }
            if (baseNode && !baseNode.contains(e.target) && e.target !== baseNode) { alert('[错误] 点击超出了卡片容器范围！'); e.target.classList.remove('spider-highlight'); return; }
            currentElement = e.target; elementHistory = []; openDialog(false);
        }
    };

    function togglePicking(isOn) {
        ['mouseover', 'mouseout', 'click', 'touchstart', 'touchend'].forEach(ev => { if (isOn) document.addEventListener(ev, handleEvent, {capture: true, passive: false}); else document.removeEventListener(ev, handleEvent, {capture: true}); });
        if (!isOn) document.querySelectorAll('.spider-highlight').forEach(el => el.classList.remove('spider-highlight'));
    }

    UI.panel.addEventListener('click', (e) => {
        if ((currentPickingFieldId !== null || currentFilterPicking !== null || currentBatchSniff !== null) && UI.panel.classList.contains('picking-mode')) {
            if (e.target.closest('.sp_icon_btn') || e.target.closest('.sp_task_item')) return; 
            e.preventDefault(); e.stopPropagation(); togglePicking(false); resetPanelTitle();
            UI.panel.classList.remove('picking-mode'); UI.panel.style.cursor = 'default';
            currentPickingFieldId = null; currentFilterPicking = null; currentBatchSniff = null;
            if (currentTab === 'filter') renderFilterTab(); else renderTaskList();
        }
    });

    UI.btnReselect.onclick = () => {
        UI.dialogBox.classList.remove('show');
        setTimeout(() => {
            UI.dialogOverlay.style.display = 'none';
            UI.dialogBox.classList.remove('collapsed'); UI.btnRestore.style.display = 'none'; UI.dialogTitle.style.display = 'block'; UI.fieldHint.style.display = 'inline-block'; UI.fieldHint.style.margin = '0';
            
            if (currentFilterPicking) {
                let name = spiderConfig.filter.list[currentFilterPicking.classIdx].items[currentFilterPicking.filterIdx].name;
                UI.panelTitle.textContent = `重新提取 - ${name} (${currentFilterPicking.type==='n'?'选名':'选值'})`;
            } else {
                const fSchema = TAB_SCHEMAS[currentTab].fields.find(x => x.id === currentPickingFieldId);
                UI.panelTitle.textContent = `Spider 规则构建 - ${fSchema.name}`;
            }
            UI.panelTitle.classList.add('picking'); UI.btnManual.style.display = 'flex'; UI.panel.classList.add('picking-mode'); UI.panel.style.cursor = 'pointer'; 
            currentElement = null; tempExtraction = null; togglePicking(true);
        }, 300);
    };

    function openDialog(isEditMode = false) { 
        togglePicking(false); UI.btnManual.style.display = 'none'; 
        UI.dialogBox.classList.remove('collapsed'); UI.btnRestore.style.display = 'none'; UI.dialogTitle.style.display = 'block'; UI.fieldHint.style.display = 'inline-block'; UI.fieldHint.style.margin = '0';
        refreshDialog(isEditMode); 
        UI.btnReselect.style.display = isEditMode ? 'block' : 'none'; 
        UI.dialogOverlay.style.display = 'flex'; 
        setTimeout(() => UI.dialogBox.classList.add('show'), 10); 
    }

    // [核心提取算法修复：允许截断泛型的最底层级和包裹层级]
    function getSelector(el, stopNode, isAbsolute) {
        if (!el || el === stopNode) return '';
        let path = []; let current = el; let depth = 0;
        let isBatchField = currentFilterPicking ? true : (currentPickingFieldId ? TAB_SCHEMAS[currentTab].fields.find(x => x.id === currentPickingFieldId)?.isBatch : false);

        while (current && current.nodeType === 1 && current !== stopNode && current.tagName !== 'BODY') {
            let sel = current.tagName.toLowerCase(); let hasId = false;
            
            // 是否属于泛型包装层(如 <li> 或 <div>)，需剥离 nth-of-type 以实现批量提取同行元素
            let isGenericWrapper = isBatchField && (depth === 0 || (depth === 1 && (!current.className || current.tagName === 'LI')));

            if (!isGenericWrapper && current.id && !current.id.includes('__spider')) { sel += '#' + CSS.escape(current.id); hasId = true; }
            
            let hasClass = false;
            if (!isGenericWrapper && !hasId && current.className) {
                let classStr = typeof current.className === 'string' ? current.className : (current.className.baseVal || '');
                let classes = classStr.trim().split(/\s+/).filter(c => c && !c.includes('spider-highlight') && !/^[a-zA-Z0-9\-_]{8,}$/.test(c));
                if (classes.length > 0) { sel += '.' + CSS.escape(classes[0]); hasClass = true; }
            }
            if (hasId) { path.unshift(sel); break; }
            
            let nth = 1, sibling = current;
            while (sibling = sibling.previousElementSibling) { if (sibling.tagName === current.tagName) nth++; }
            
            if (isAbsolute || nth > 1 || !hasClass) { 
                if (!isGenericWrapper) { sel += `:nth-of-type(${nth})`; }
            }
            path.unshift(sel); current = current.parentNode; depth++;
        }
        return path.join(' > ');
    }

    function refreshDialog(isEditMode = false) {
        document.querySelectorAll('.spider-highlight').forEach(el => el.classList.remove('spider-highlight'));
        if(currentElement) currentElement.classList.add('spider-highlight');
        UI.chkAbsolute.checked = useAbsoluteSelector; let stopNode = null;
        
        if (currentFilterPicking) { UI.fieldHint.textContent = `【树状筛选 - 提取${currentFilterPicking.type==='n'?'名称':'参数值'}】`; } 
        else { const fSchema = TAB_SCHEMAS[currentTab].fields.find(x => x.id === currentPickingFieldId); UI.fieldHint.textContent = `【${fSchema.name}】`; if (fSchema && !fSchema.global && spiderConfig[currentTab].container) stopNode = spiderConfig[currentTab].container.node; }

        if (currentPickingFieldId === 'container' && !currentFilterPicking) {
            UI.pathControls.style.display = 'flex'; UI.btnParentNode.style.display = 'block'; UI.btnChildNode.style.display = 'block';
            let absSel = getSelector(currentElement, null, useAbsoluteSelector);
            if(!isEditMode) tempExtraction = { type: 'container', absSel: absSel };
            UI.cssPath.textContent = '容器: ' + tempExtraction.absSel;
            UI.attrContainer.innerHTML = '<div style="padding:24px; text-align:center; color:#007aff; font-weight:bold; font-size:14px;">已锁定外层框架<br><br><span style="font-size:12px;color:#8e8e93;font-weight:normal;">如不准确可点击扩大或重选</span></div>';
        } else {
            let generatedSel = currentElement ? getSelector(currentElement, stopNode, useAbsoluteSelector) : '';
            if(!isEditMode) {
                if(!currentElement) tempExtraction = { type: 'custom', key: '', val: '', sel: '', filters: [] };
                else tempExtraction = { type: tempExtraction?.type || 'text', key: tempExtraction?.key || '', val: '', sel: generatedSel, filters: tempExtraction?.filters || [] };
            }
            if (!currentElement) { UI.pathControls.style.display = 'none'; UI.cssPath.textContent = '路径: [无 (采用自定义固定值)]'; UI.btnParentNode.style.display = 'none'; UI.btnChildNode.style.display = 'none'; } 
            else { UI.pathControls.style.display = 'flex'; UI.cssPath.textContent = tempExtraction.sel ? '路径: ' + tempExtraction.sel : '路径: (当前节点本身)'; UI.btnParentNode.style.display = 'block'; UI.btnChildNode.style.display = 'block'; }
            
            let htmlStr = `<label class="sp_attr_item"><div style="display:flex; align-items:center; width:100%;"><input type="radio" name="sp_ex" value="custom" ${tempExtraction.type==='custom'?'checked':''}><span class="sp_attr_name" style="color:#ff9500;">[固定值]</span><input type="text" id="sp_custom_input" placeholder="输入内容..." value="${tempExtraction.val || ''}" style="flex:1; border:1px solid #e5e5ea; border-radius:4px; padding:6px 8px; outline:none; font-size:12px;"></div></label>`;
            if (currentElement) {
                htmlStr += `<label class="sp_attr_item"><input type="radio" name="sp_ex" value="text" ${tempExtraction.type==='text'?'checked':''}><span class="sp_attr_name">[纯文本]</span><span class="sp_attr_val">${currentElement.textContent.trim() || '(无)'}</span></label>`;
                htmlStr += `<label class="sp_attr_item"><input type="radio" name="sp_ex" value="html" ${tempExtraction.type==='html'?'checked':''}><span class="sp_attr_name" style="color:#34c759;">[内部源码]</span><span class="sp_attr_val">innerHTML</span></label>`;
                htmlStr += `<label class="sp_attr_item"><input type="radio" name="sp_ex" value="outerhtml" ${tempExtraction.type==='outerhtml'?'checked':''}><span class="sp_attr_name" style="color:#34c759;">[外部源码]</span><span class="sp_attr_val">outerHTML</span></label>`;
                Array.from(currentElement.attributes).forEach(attr => { let isChecked = (tempExtraction.type==='attr' && tempExtraction.key===attr.name) ? 'checked' : ''; htmlStr += `<label class="sp_attr_item"><input type="radio" name="sp_ex" value="attr:${attr.name}" ${isChecked}><span class="sp_attr_name" style="color:#007aff;">${attr.name}</span><span class="sp_attr_val">${attr.value}</span></label>`; });
            } else { htmlStr += `<div style="padding:16px; color:#8e8e93; text-align:center; font-size:12px;">提示：您选择了手动输入固定值。<br>如需提取请点击重选。</div>`; }
            UI.attrContainer.innerHTML = htmlStr;
            
            shadow.querySelectorAll('input[name="sp_ex"]').forEach(r => r.addEventListener('change', (e) => {
                if(e.target.value === 'text') tempExtraction.type = 'text'; else if (e.target.value === 'custom') tempExtraction.type = 'custom'; else if (e.target.value === 'html') tempExtraction.type = 'html'; else if (e.target.value === 'outerhtml') tempExtraction.type = 'outerhtml'; else { tempExtraction.type = 'attr'; tempExtraction.key = e.target.value.split(':')[1]; }
            }));
            const customInput = shadow.querySelector('#sp_custom_input');
            if (customInput) { customInput.onclick = () => { shadow.querySelector('input[value="custom"]').checked = true; tempExtraction.type = 'custom'; }; customInput.oninput = (e) => { tempExtraction.val = e.target.value; if (shadow.querySelector('input[value="custom"]').checked === false) { shadow.querySelector('input[value="custom"]').checked = true; tempExtraction.type = 'custom'; } }; }
        }
        renderFilters();
    }

    function renderFilters() {
        let isContainer = currentPickingFieldId === 'container';
        if (isContainer && !currentFilterPicking) { UI.filterCard.style.display = 'none'; return; }
        UI.filterCard.style.display = 'flex';
        if (!tempExtraction || !tempExtraction.filters || tempExtraction.filters.length === 0) { UI.filterList.innerHTML = ''; UI.filterList.style.display = 'none'; return; }
        UI.filterList.style.display = 'flex'; let html = ''; let delBtnHtml = `<button class="sp_icon_btn f_del" style="width:24px; height:24px; flex-shrink:0;">${svgIcons.close}</button>`;

        tempExtraction.filters.forEach((flt, idx) => {
            if (flt.type === 'replace') { html += `<div class="sp_filter_item"><span style="font-size:12px; color:#666; font-weight:bold;">替换</span><input type="text" class="sp_filter_input f_from" data-idx="${idx}" placeholder="被替换词" value="${flt.from || ''}"><span style="color:#999; font-size:12px;">➞</span><input type="text" class="sp_filter_input f_to" data-idx="${idx}" placeholder="替换为" value="${flt.to || ''}">${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; } 
            else if (flt.type === 'split') { let dIdx = (parseInt(flt.index)||0)+1; html += `<div class="sp_filter_item"><span style="font-size:12px; color:#666; font-weight:bold;">分割</span><input type="text" class="sp_filter_input f_sep" data-idx="${idx}" placeholder="分割符" value="${flt.sep || ''}" style="flex:2;"><span style="color:#999; font-size:12px; white-space:nowrap;">取第</span><input type="number" min="1" class="sp_filter_input f_index" data-idx="${idx}" placeholder="1" value="${dIdx}" style="flex:1;"><span style="color:#999; font-size:12px;">段</span>${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; } 
            else if (flt.type === 'between') { html += `<div class="sp_filter_item"><span style="font-size:12px; color:#666; font-weight:bold;">取中间</span><input type="text" class="sp_filter_input f_left" data-idx="${idx}" placeholder="左侧字符" value="${flt.left || ''}" style="flex:1;"><span style="color:#999; font-size:12px;">与</span><input type="text" class="sp_filter_input f_right" data-idx="${idx}" placeholder="右侧字符" value="${flt.right || ''}" style="flex:1;">${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; }
            else if (flt.type === 'regex') { html += `<div class="sp_filter_item"><span style="font-size:12px; color:#666; font-weight:bold;">正则</span><div style="position:relative; flex:1; display:flex;"><input type="text" class="sp_filter_input f_pattern" data-idx="${idx}" placeholder="匹配规则" value="${flt.pattern || ''}" style="padding-right:26px;"><button class="sp_magic_btn" data-idx="${idx}">${svgIcons.magic}</button><div class="sp_regex_menu" id="rmenu_${idx}"><div class="sp_regex_menu_item" data-idx="${idx}" data-val="\\d+">提取数字</div><div class="sp_regex_menu_item" data-idx="${idx}" data-val="[\\u4e00-\\u9fa5]+">提取中文</div><div class="sp_regex_menu_item" data-idx="${idx}" data-val="[a-zA-Z]+">提取字母</div></div></div>${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; } 
            else if (flt.type === 'urldecode') { html += `<div class="sp_filter_item"><span style="font-size:12px; color:#007aff; font-weight:bold;">URL 解码</span><div style="flex:1;"></div>${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; }
            else if (flt.type === 'remove_space') { html += `<div class="sp_filter_item"><span style="font-size:12px; color:#ff9500; font-weight:bold;">去空白换行</span><div style="flex:1;"></div>${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; } 
            else if (flt.type === 'prepend') { html += `<div class="sp_filter_item"><span style="font-size:12px; color:#007aff; font-weight:bold;">前缀</span><input type="text" class="sp_filter_input f_text" data-idx="${idx}" placeholder="补充在前面" value="${flt.text || ''}">${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; } 
            else if (flt.type === 'append') { html += `<div class="sp_filter_item"><span style="font-size:12px; color:#007aff; font-weight:bold;">后缀</span><input type="text" class="sp_filter_input f_text" data-idx="${idx}" placeholder="追加在后面" value="${flt.text || ''}">${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; } 
            else if (flt.type === 'remove_html') { html += `<div class="sp_filter_item"><span style="font-size:12px; color:#ff9500; font-weight:bold;">去HTML</span><div style="flex:1;"></div>${delBtnHtml.replace('f_del"', `f_del" data-idx="${idx}"`)}</div>`; }
        });
        UI.filterList.innerHTML = html;

        shadow.querySelectorAll('.f_from').forEach(el => el.oninput = (e) => tempExtraction.filters[e.target.dataset.idx].from = e.target.value);
        shadow.querySelectorAll('.f_to').forEach(el => el.oninput = (e) => tempExtraction.filters[e.target.dataset.idx].to = e.target.value);
        shadow.querySelectorAll('.f_sep').forEach(el => el.oninput = (e) => tempExtraction.filters[e.target.dataset.idx].sep = e.target.value);
        shadow.querySelectorAll('.f_left').forEach(el => el.oninput = (e) => tempExtraction.filters[e.target.dataset.idx].left = e.target.value);
        shadow.querySelectorAll('.f_right').forEach(el => el.oninput = (e) => tempExtraction.filters[e.target.dataset.idx].right = e.target.value);
        shadow.querySelectorAll('.f_pattern').forEach(el => el.oninput = (e) => tempExtraction.filters[e.target.dataset.idx].pattern = e.target.value);
        shadow.querySelectorAll('.f_text').forEach(el => el.oninput = (e) => tempExtraction.filters[e.target.dataset.idx].text = e.target.value);
        shadow.querySelectorAll('.f_index').forEach(el => el.oninput = (e) => { let h = parseInt(e.target.value); if(isNaN(h)) h=1; tempExtraction.filters[e.target.dataset.idx].index = Math.max(0, h - 1); });
        shadow.querySelectorAll('.f_del').forEach(el => el.onclick = (e) => { tempExtraction.filters.splice(e.target.closest('.f_del').dataset.idx, 1); renderFilters(); });

        shadow.querySelectorAll('.sp_magic_btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation(); const tBtn = e.target.closest('.sp_magic_btn'); const menu = shadow.querySelector('#rmenu_' + tBtn.dataset.idx); const isShow = menu.style.display === 'flex';
                shadow.querySelectorAll('.sp_regex_menu').forEach(m => m.style.display = 'none');
                if (!isShow) { menu.style.display = 'flex'; const cardRect = UI.filterCard.getBoundingClientRect(); const btnRect = tBtn.getBoundingClientRect(); if (cardRect.bottom - btnRect.bottom < 110) { menu.style.top = 'auto'; menu.style.bottom = 'calc(100% + 4px)'; } else { menu.style.top = 'calc(100% + 4px)'; menu.style.bottom = 'auto'; } }
            };
        });
        shadow.querySelectorAll('.sp_regex_menu_item').forEach(item => { item.onclick = (e) => { e.stopPropagation(); tempExtraction.filters[e.target.dataset.idx].pattern = e.target.dataset.val; renderFilters(); }; });
    }

    shadow.addEventListener('click', () => { shadow.querySelectorAll('.sp_regex_menu').forEach(m => m.style.display = 'none'); });
    shadow.querySelector('#sp_btn_add_replace').onclick = () => { tempExtraction.filters.push({type: 'replace', from:'', to:''}); renderFilters(); };
    shadow.querySelector('#sp_btn_add_split').onclick = () => { tempExtraction.filters.push({type: 'split', sep:'', index:0}); renderFilters(); }; 
    shadow.querySelector('#sp_btn_add_between').onclick = () => { tempExtraction.filters.push({type: 'between', left:'', right:''}); renderFilters(); }; 
    shadow.querySelector('#sp_btn_add_regex').onclick = () => { tempExtraction.filters.push({type: 'regex', pattern:''}); renderFilters(); };
    shadow.querySelector('#sp_btn_add_urldecode').onclick = () => { tempExtraction.filters.push({type: 'urldecode'}); renderFilters(); };
    shadow.querySelector('#sp_btn_add_nospace').onclick = () => { tempExtraction.filters.push({type: 'remove_space'}); renderFilters(); }; 
    shadow.querySelector('#sp_btn_add_prepend').onclick = () => { tempExtraction.filters.push({type: 'prepend', text:''}); renderFilters(); };
    shadow.querySelector('#sp_btn_add_append').onclick = () => { tempExtraction.filters.push({type: 'append', text:''}); renderFilters(); };
    shadow.querySelector('#sp_btn_add_nohtml').onclick = () => { tempExtraction.filters.push({type: 'remove_html'}); renderFilters(); };

    // [折叠控制]
    UI.btnParentNode.onclick = () => {
        if (!currentElement || currentElement.tagName === 'BODY') return;
        let boundNode = document;
        if (!currentFilterPicking && TAB_SCHEMAS[currentTab].isList && currentPickingFieldId !== 'container') {
            let conf = spiderConfig[currentTab]; let fSchema = TAB_SCHEMAS[currentTab].fields.find(x => x.id === currentPickingFieldId);
            if (!fSchema.global && conf.container && conf.container.node) boundNode = conf.container.node;
        }
        if (currentElement === boundNode) { alert('[提示] 已达到约束边界！'); return; }
        elementHistory.push(currentElement); currentElement = currentElement.parentElement; refreshDialog(false);
        UI.dialogBox.classList.add('collapsed'); UI.btnRestore.style.display = 'block'; UI.dialogTitle.style.display = 'none'; UI.fieldHint.style.display = 'inline-block'; UI.fieldHint.style.margin = '0';
    };

    UI.btnChildNode.onclick = () => { 
        if (elementHistory.length === 0) { alert('[提示] 已经是底层的节点了！'); return; } 
        currentElement = elementHistory.pop(); refreshDialog(false); 
        UI.dialogBox.classList.add('collapsed'); UI.btnRestore.style.display = 'block'; UI.dialogTitle.style.display = 'none'; UI.fieldHint.style.display = 'inline-block'; UI.fieldHint.style.margin = '0';
    };

    UI.btnRestore.onclick = () => {
        UI.dialogBox.classList.remove('collapsed'); UI.btnRestore.style.display = 'none'; UI.dialogTitle.style.display = 'block'; UI.fieldHint.style.display = 'inline-block'; UI.fieldHint.style.marginTop = '6px';
    };

    function closeDialog() {
        if(currentElement) currentElement.classList.remove('spider-highlight');
        UI.dialogBox.classList.remove('show');
        setTimeout(() => { 
            UI.dialogOverlay.style.display = 'none'; resetPanelTitle();
            UI.panel.classList.remove('picking-mode'); UI.panel.style.cursor = 'default';
            currentPickingFieldId = null; tempExtraction = null; currentFilterPicking = null; 
            UI.dialogBox.classList.remove('collapsed'); // Reset
            if (currentTab === 'filter') renderFilterTab(); else renderTaskList(); 
        }, 300);
    }
    
    shadow.querySelector('#sp_btn_cancel').onclick = closeDialog;

    // [核心提取保存：全自动全域映射引擎]
    shadow.querySelector('#sp_btn_confirm').onclick = () => {
        let safeFilters = tempExtraction.filters ? JSON.parse(JSON.stringify(tempExtraction.filters)) : [];
        let eData = { type: tempExtraction.type, val: tempExtraction.val, key: tempExtraction.key, filters: safeFilters };
        
        if (currentFilterPicking) {
            let cIdx = currentFilterPicking.classIdx; let fIdx = currentFilterPicking.filterIdx; let t = currentFilterPicking.type;
            let currItem = spiderConfig.filter.list[cIdx].items[fIdx];
            let newSel = tempExtraction.type === 'custom' ? '' : tempExtraction.sel;
            currItem[t] = { sel: newSel, extract: eData };

            // 🎯 核心全域同步映射：如果当前维度属于批量嗅探出来的，且选择器包含基准特征，则强行覆盖其兄弟维度的配置
            if (currItem.batchId && currItem.baseSel && newSel && newSel.startsWith(currItem.baseSel)) {
                let relativeSel = newSel.substring(currItem.baseSel.length); // 切割出相对偏移路径 (例如： > li > a)
                spiderConfig.filter.list[cIdx].items.forEach(sib => {
                    // 找到跟自己同属一批被嗅探出来、但 baseSel 不同的兄弟，强行套用相对路径和清洗规则
                    if (sib.batchId === currItem.batchId && sib !== currItem && sib.baseSel) {
                        sib[t] = { sel: sib.baseSel + relativeSel, extract: JSON.parse(JSON.stringify(eData)) };
                    }
                });
            }
            saveConfig(); closeDialog(); return;
        }

        const conf = spiderConfig[currentTab];
        if (currentPickingFieldId === 'container') { conf[currentPickingFieldId].sel = tempExtraction.absSel; conf[currentPickingFieldId].node = currentElement; } 
        else { conf[currentPickingFieldId].sel = tempExtraction.type === 'custom' ? '' : tempExtraction.sel; conf[currentPickingFieldId].extract = eData; }
        if (conf._reuse) conf._reuse = null;
        saveConfig(); closeDialog();
    };

// =========================================================================
    // === [BLOCK 6: 终极代码生成与编译引擎] ===
    // =========================================================================
    function applyFilters(val, filters) {
        let res = val || ''; if (typeof res !== 'string') res = String(res);
        if (!filters || filters.length === 0) return res.trim();
        filters.forEach(flt => {
            if (flt.type === 'replace' && flt.from) res = res.split(flt.from).join(flt.to || '');
            else if (flt.type === 'split' && flt.sep) { let idx = parseInt(flt.index)||0; res = res.split(flt.sep)[idx] !== undefined ? res.split(flt.sep)[idx] : ''; }
            else if (flt.type === 'between' && flt.left && flt.right) { if(res.includes(flt.left)){ res = res.split(flt.left)[1].split(flt.right)[0] || ''; } else { res = ''; } }
            else if (flt.type === 'urldecode') { try { res = decodeURIComponent(res); } catch(e){} }
            else if (flt.type === 'regex' && flt.pattern) { try { let m = res.match(new RegExp(flt.pattern)); res = m ? m[0] : ''; } catch(e) {} }
            else if (flt.type === 'remove_space') res = res.replace(/[\s\u3000]+/g, '');
            else if (flt.type === 'prepend') res = (flt.text || '') + res;
            else if (flt.type === 'append') res = res + (flt.text || '');
            else if (flt.type === 'remove_html') res = res.replace(/<[^>]+>/g, '');
        });
        return res.trim();
    }

    function genFiltersCode(vName, filters, indNum) {
        if (!filters || filters.length === 0) return '';
        let iStr = ' '.repeat(indNum); let c = '';
        filters.forEach(flt => {
            if (flt.type === 'replace' && flt.from) c += `${iStr}${vName} = String(${vName}).split('${flt.from.replace(/'/g, "\\'")}').join('${(flt.to||'').replace(/'/g, "\\'")}');\n`;
            else if (flt.type === 'split' && flt.sep) c += `${iStr}${vName} = String(${vName}).split('${flt.sep.replace(/'/g, "\\'")}')[${parseInt(flt.index)||0}] || '';\n`;
            else if (flt.type === 'between' && flt.left && flt.right) c += `${iStr}if(String(${vName}).includes('${flt.left.replace(/'/g, "\\'")}')){ ${vName} = String(${vName}).split('${flt.left.replace(/'/g, "\\'")}')[1].split('${flt.right.replace(/'/g, "\\'")}')[0] || ''; } else { ${vName} = ''; }\n`;
            else if (flt.type === 'urldecode') c += `${iStr}try { ${vName} = decodeURIComponent(${vName}); } catch(e) {}\n`;
            else if (flt.type === 'regex' && flt.pattern) c += `${iStr}${vName} = String(${vName}).match(/${flt.pattern.replace(/\\/g, "\\\\").replace(/\//g, "\\/")}/)?.[0] || '';\n`;
            else if (flt.type === 'remove_space') c += `${iStr}${vName} = String(${vName}).replace(/[\\s\\u3000]+/g, '');\n`;
            else if (flt.type === 'prepend') c += `${iStr}${vName} = '${(flt.text||'').replace(/'/g, "\\'")}' + String(${vName});\n`;
            else if (flt.type === 'append') c += `${iStr}${vName} = String(${vName}) + '${(flt.text||'').replace(/'/g, "\\'")}';\n`;
            else if (flt.type === 'remove_html') c += `${iStr}${vName} = String(${vName}).replace(/<[^>]+>/g, '');\n`;
        });
        return c;
    }

    function generateParseListCodeStr(tabName) {
        let conf = spiderConfig[tabName]; let schema = TAB_SCHEMAS[tabName];
        let c = `function parseVideoList() {\n    var vod = [];\n    var items = document.querySelectorAll('${conf.container.sel}');\n    items.forEach(function(item) {\n`;
        let vodKeys = [];
        schema.fields.forEach(f => {
            if (f.id === 'container' || f.global || !conf[f.id].extract) return;
            let data = conf[f.id];
            if (data.extract.type === 'custom') { c += `        var ${f.id} = '${(data.extract.val||'').replace(/'/g, "\\'")}';\n`; } 
            else {
                let queryCode = data.sel ? `item.querySelector('${data.sel}')` : `item`;
                let exCode = data.extract.type === 'text' ? `?.textContent` : data.extract.type === 'html' ? `?.innerHTML` : data.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${data.extract.key}')`;
                c += `        var ${f.id} = ${queryCode}${exCode} || '';\n`;
            }
            c += genFiltersCode(f.id, data.extract.filters, 8); c += `        ${f.id} = String(${f.id}).trim();\n`; vodKeys.push(f.id);
        });
        c += `        var _item_data = { ${vodKeys.map(k => `${k}: ${k}`).join(', ')} };\n`;
        c += `        if (Object.values(_item_data).some(function(v) { return v !== ''; })) { vod.push(_item_data); }\n    });\n    return vod;\n}\n`;
        return c;
    }

    function buildStaticFilterConfig() {
        let fConf = { class: [], filters: {} };
        spiderConfig.filter.list.forEach(cls => {
            if (!cls.val || cls.val.trim() === '') return; 
            let cId = cls.val.trim();
            if (cls.name) fConf.class.push({ type_id: cId, type_name: cls.name.trim() });
            
            let fArr = [];
            cls.items.forEach((item, fIdx) => {
                let k = item.key || 'key_' + fIdx; let nm = item.name || '未知';
                let vList = [];
                let nNodes = item.n && item.n.extract && item.n.extract.type !== 'custom' && item.n.sel ? document.querySelectorAll(item.n.sel) : [];
                let vNodes = item.v && item.v.extract && item.v.extract.type !== 'custom' && item.v.sel ? document.querySelectorAll(item.v.sel) : [];
                let mx = Math.max(item.n && item.n.extract && item.n.extract.type === 'custom' ? 1 : nNodes.length, item.v && item.v.extract && item.v.extract.type === 'custom' ? 1 : vNodes.length);
                for(let i=0; i<mx; i++) {
                    let nR = '', vR = '';
                    if (item.n && item.n.extract) {
                        if (item.n.extract.type === 'custom') nR = item.n.extract.val;
                        else if (nNodes[i]) { let type = item.n.extract.type; nR = type === 'text' ? nNodes[i].textContent : type === 'html' ? nNodes[i].innerHTML : type === 'outerhtml' ? nNodes[i].outerHTML : nNodes[i].getAttribute(item.n.extract.key); }
                        nR = applyFilters(nR, item.n.extract.filters);
                    }
                    if (item.v && item.v.extract) {
                        if (item.v.extract.type === 'custom') vR = item.v.extract.val;
                        else if (vNodes[i]) { let type = item.v.extract.type; vR = type === 'text' ? vNodes[i].textContent : type === 'html' ? vNodes[i].innerHTML : type === 'outerhtml' ? vNodes[i].outerHTML : vNodes[i].getAttribute(item.v.extract.key); }
                        vR = applyFilters(vR, item.v.extract.filters);
                    }
                    // 只录入非空的值，避免脏数据写入
                    if (nR || vR) vList.push({ n: nR||vR, v: vR||'' });
                }
                if (vList.length > 0) fArr.push({ key: k, name: nm, value: vList });
            });
            if (fArr.length > 0) fConf.filters[cId] = fArr;
        });
        return fConf;
    }

    shadow.querySelector('#sp_run_test').onclick = () => {
        UI.outHeader.style.display = 'flex'; const codeTabEl = shadow.querySelector('[data-target="sp_code_output"]');

        if (currentTab === 'global') {
            codeTabEl.textContent = '完整脚本'; let g = spiderConfig.global;
            let fullCode = `/**\n * Spider UI 规则\n * @config\n * debug: true\n * returnType: dom\n */\n\nvar BASE = '${g.base || ''}';\n\nfunction init(cfg) {\n    return {};\n}\n\n`;
            fullCode += `// 1. 路由配置\nvar spider = {\n    routes: {\n`;
            const fmt = (str) => "'" + str.replace(/'/g, "\\'").replace(/\{BASE\}/g, "' + BASE + '") + "'";
            if (g.home) fullCode += `        homeContent: function() {\n            return ${fmt(g.home)};\n        },\n        homeVideoContent: function() {\n            return ${fmt(g.home)};\n        },\n`;
            if (g.category) {
                let s = g.category.replace(/'/g, "\\'").replace(/\{BASE\}/g, "' + BASE + '").replace(/\{tid\}/g, "' + tid + '").replace(/\{pg\}/g, "' + pg + '");
                fullCode += `        categoryContent: function(tid, pg, filter, extend) {\n            var url = '${s}';\n`;
                if (g.cat_pg1) fullCode += `            if (parseInt(pg) === 1) { url = url.replace(/-1\\.html/g, '.html').replace(/\\/page\\/1/g, ''); }\n`;
                fullCode += `            return url;\n        },\n`;
            }
            if (g.detail) {
                let detUrl = g.detail.replace(/'/g, "\\'").replace(/\{BASE\}/g, "' + BASE + '").replace(/\{id\}/g, "' + id + '");
                fullCode += `        detailContent: function(ids) {\n            var id = Array.isArray(ids) ? ids[0] || '' : ids || '';\n            return '${detUrl}';\n        },\n`;
            }
            if (g.search) {
                let sUrl = g.search.replace(/'/g, "\\'").replace(/\{BASE\}/g, "' + BASE + '").replace(/\{wd\}/g, "' + encodeURIComponent(wd) + '").replace(/\{pg\}/g, "' + pg + '");
                fullCode += `        searchContent: function(wd, pg) {\n            var url = '${sUrl}';\n`;
                if (g.search_pg1) fullCode += `            if (parseInt(pg) === 1) { url = url.replace(/-1\\.html/g, '.html').replace(/\\/page\\/1/g, ''); }\n`;
                fullCode += `            return url;\n        }\n`;
            }
            fullCode += `    }\n};\n\n`; fullCode = fullCode.replace(/,\n    \}/g, '\n    }');

            fullCode += `// 2. 数据提取\nfunction homeContent(filter) {\n`;
            let fConfig = buildStaticFilterConfig();
            fullCode += `    var filterConfig = ${JSON.stringify(fConfig, null, 4)};\n    return filterConfig;\n}\n\n`;

            let genF = [];
            function addP(tN) {
                 if (!spiderConfig[tN].container || !spiderConfig[tN].container.sel) return null;
                 let bd = generateParseListCodeStr(tN).replace(/function parseVideoList\(\) \{\n/, '').replace(/\}$/, '');
                 let wrap = `function _temp_name_() {\n${bd}}\n`;
                 for(let z of genF) { if (z.body.replace(/_temp_name_/g,'') === wrap.replace(/_temp_name_/g,'')) return z.name; }
                 let nm = 'parseVideoList' + (genF.length ? genF.length + 1 : '');
                 if(genF.length===0) nm = 'parseVideoList'; genF.push({ name: nm, body: wrap.replace(/_temp_name_/g, nm) }); return nm;
            }

            let hn = addP('home'); fullCode += `function homeVideoContent() {\n    return { list: ${hn ? hn+'()' : '[]'} };\n}\n\n`;
            let cn = addP('category'); fullCode += `function categoryContent(tid, pg, filter, extend) {\n`;
            ['pagecount', 'limit', 'total'].forEach(k => {
                if (spiderConfig.category[k] && spiderConfig.category[k].extract) {
                    let pd = spiderConfig.category[k];
                    if (pd.extract.type === 'custom') fullCode += `    var _${k}_raw = '${(pd.extract.val||'').replace(/'/g, "\\'")}';\n`;
                    else {
                        let pq = pd.sel ? `document.querySelector('${pd.sel}')` : `document`; let xC = pd.extract.type === 'text' ? `?.textContent` : pd.extract.type === 'html' ? `?.innerHTML` : pd.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${pd.extract.key}')`;
                        fullCode += `    var _${k}_raw = ${pq}${xC} || '';\n`;
                    }
                    fullCode += `    var _${k} = _${k}_raw;\n`; fullCode += genFiltersCode(`_${k}`, pd.extract.filters, 4); fullCode += `    _${k} = parseInt(String(_${k}).match(/\\d+/)?.[0]) || 0;\n\n`;
                }
            });
            fullCode += `    var vod = ${cn ? cn+'()' : '[]'};\n    return {\n        code: 1,\n        msg: "数据列表",\n        page: typeof pg !== 'undefined' ? pg : 1,\n        pagecount: ${spiderConfig.category.pagecount?.extract ? '_pagecount' : '99'},\n        limit: ${spiderConfig.category.limit?.extract ? '_limit' : 'vod.length'},\n        total: ${spiderConfig.category.total?.extract ? '_total' : 'vod.length'},\n        list: vod\n    };\n}\n\n`;

            fullCode += `function detailContent(ids) {\n    var detail = {};\n`;
            TAB_SCHEMAS.detail.fields.forEach(f => {
                if (f.isPlay || !spiderConfig.detail[f.id].extract) return;
                let dt = spiderConfig.detail[f.id];
                if (dt.extract.type === 'custom') fullCode += `    detail.${f.id} = '${(dt.extract.val||'').replace(/'/g, "\\'")}';\n`;
                else { let qc = `document.querySelector('${dt.sel}')`; let xC = dt.extract.type === 'text' ? `?.textContent` : dt.extract.type === 'html' ? `?.innerHTML` : dt.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${dt.extract.key}')`; fullCode += `    detail.${f.id} = ${qc}${xC} || '';\n`; }
                fullCode += genFiltersCode(`detail.${f.id}`, dt.extract.filters, 4); fullCode += `    detail.${f.id} = String(detail.${f.id}).trim();\n\n`;
            });
            let dConf = spiderConfig.detail;
            if (dConf.vod_play_title && dConf.vod_play_url && dConf.vod_play_title.extract && dConf.vod_play_url.extract) {
                fullCode += `    var playFroms = []; var playUrls = [];\n`;
                fullCode += `    var fromNodes = ${dConf.vod_play_from && dConf.vod_play_from.extract && dConf.vod_play_from.extract.type !== 'custom' && dConf.vod_play_from.sel ? `document.querySelectorAll('${dConf.vod_play_from.sel}')` : `[]`};\n`;
                fullCode += `    var titleNodes = ${dConf.vod_play_title.extract.type !== 'custom' && dConf.vod_play_title.sel ? `document.querySelectorAll('${dConf.vod_play_title.sel}')` : `[]`};\n`;
                fullCode += `    var urlNodes = ${dConf.vod_play_url.extract.type !== 'custom' && dConf.vod_play_url.sel ? `document.querySelectorAll('${dConf.vod_play_url.sel}')` : `[]`};\n`;
                fullCode += `    var baseNodes = titleNodes.length > 0 ? titleNodes : urlNodes; var epGroups = []; var currentGroup = []; var lastContainer = null;\n    for(var j=0; j<baseNodes.length; j++) { var node = baseNodes[j]; var container = node.closest('ul') || node.closest('div[class*="list"]') || node.closest('.stui-content__playlist') || node.parentElement.parentElement;\n        if (lastContainer && container !== lastContainer) { epGroups.push(currentGroup); currentGroup = []; } currentGroup.push(j); lastContainer = container; } if (currentGroup.length > 0) epGroups.push(currentGroup);\n    var maxLen = fromNodes.length > 0 ? Math.min(fromNodes.length, epGroups.length) : epGroups.length;\n    for(var i=0; i<maxLen; i++) {\n`;
                if (dConf.vod_play_from && dConf.vod_play_from.extract) {
                    if (dConf.vod_play_from.extract.type === 'custom') fullCode += `        var fromName = '${(dConf.vod_play_from.extract.val||'').replace(/'/g, "\\'")}';\n`;
                    else { let fEx = dConf.vod_play_from.extract.type === 'text' ? `?.textContent` : dConf.vod_play_from.extract.type === 'html' ? `?.innerHTML` : dConf.vod_play_from.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${dConf.vod_play_from.extract.key}')`; fullCode += `        var fromName = fromNodes[i]${fEx} || '未知线路';\n`; }
                    fullCode += genFiltersCode('fromName', dConf.vod_play_from.extract.filters, 8); fullCode += `        fromName = String(fromName).trim() || '未知线路';\n`;
                } else fullCode += `        var fromName = '未知线路';\n`;
                fullCode += `        var epList = []; var groupIndices = epGroups[i] || [];\n        for(var k=0; k<groupIndices.length; k++) { var gIdx = groupIndices[k];\n`;
                if (dConf.vod_play_title.extract.type === 'custom') fullCode += `            var epTitle = '${(dConf.vod_play_title.extract.val||'').replace(/'/g, "\\'")}';\n`;
                else { let tEx = dConf.vod_play_title.extract.type === 'text' ? `?.textContent` : dConf.vod_play_title.extract.type === 'html' ? `?.innerHTML` : dConf.vod_play_title.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${dConf.vod_play_title.extract.key}')`; fullCode += `            var epTitle = titleNodes[gIdx]${tEx} || '';\n`; }
                fullCode += genFiltersCode('epTitle', dConf.vod_play_title.extract.filters, 12); fullCode += `            epTitle = String(epTitle).trim();\n`;
                if (dConf.vod_play_url.extract.type === 'custom') fullCode += `            var epUrl = '${(dConf.vod_play_url.extract.val||'').replace(/'/g, "\\'")}';\n`;
                else { let uEx = dConf.vod_play_url.extract.type === 'text' ? `?.textContent` : dConf.vod_play_url.extract.type === 'html' ? `?.innerHTML` : dConf.vod_play_url.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${dConf.vod_play_url.extract.key}')`; fullCode += `            var epUrl = urlNodes[gIdx]${uEx} || '';\n`; }
                fullCode += genFiltersCode('epUrl', dConf.vod_play_url.extract.filters, 12); fullCode += `            epUrl = String(epUrl).trim();\n`;
                fullCode += `            if(epTitle || epUrl) epList.push((epTitle||'未知') + '$' + epUrl);\n        } if (epList.length > 0) { playFroms.push(fromName); playUrls.push(epList.join('#')); }\n    }\n    detail.vod_play_from = playFroms.join('$$$'); detail.vod_play_url = playUrls.join('$$$');\n`;
            }
            fullCode += `    return { list: [detail] };\n}\n\n`;

            let sn = addP('search');
            fullCode += `function searchContent(wd, pg) {\n`;
            ['pagecount', 'limit', 'total'].forEach(k => {
                if (spiderConfig.search[k] && spiderConfig.search[k].extract) {
                    let pd = spiderConfig.search[k];
                    if (pd.extract.type === 'custom') fullCode += `    var _${k}_raw = '${(pd.extract.val||'').replace(/'/g, "\\'")}';\n`;
                    else {
                        let pq = pd.sel ? `document.querySelector('${pd.sel}')` : `document`; let xC = pd.extract.type === 'text' ? `?.textContent` : pd.extract.type === 'html' ? `?.innerHTML` : pd.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${pd.extract.key}')`;
                        fullCode += `    var _${k}_raw = ${pq}${xC} || '';\n`;
                    }
                    fullCode += `    var _${k} = _${k}_raw;\n`; fullCode += genFiltersCode(`_${k}`, pd.extract.filters, 4); fullCode += `    _${k} = parseInt(String(_${k}).match(/\\d+/)?.[0]) || 0;\n\n`;
                }
            });
            fullCode += `    var vod = ${sn ? sn+'()' : '[]'};\n    return {\n        code: 1,\n        msg: "搜索结果",\n        page: typeof pg !== 'undefined' ? pg : 1,\n        pagecount: ${spiderConfig.search.pagecount?.extract ? '_pagecount' : '99'},\n        limit: ${spiderConfig.search.limit?.extract ? '_limit' : 'vod.length'},\n        total: ${spiderConfig.search.total?.extract ? '_total' : 'vod.length'},\n        list: vod\n    };\n}\n\n`;

            if (genF.length > 0) { fullCode += `// 3. 公共解析\n`; genF.forEach(f => { fullCode += `${f.body}\n`; }); }

            UI.codeOutput.value = fullCode; UI.testResult.textContent = "[成功] 全局编译完成！"; UI.outTabs[1].click(); return;
        }

        // ==== [局部测试与方法生成] ====
        codeTabEl.textContent = currentTab === 'filter' ? '静态配置' : '方法代码';
        const schema = TAB_SCHEMAS[currentTab], conf = spiderConfig[currentTab]; let tabCode = '';
        try {
            let liveResult = null;
            if (currentTab === 'filter') {
                let sData = buildStaticFilterConfig(); liveResult = sData;
                tabCode = `// 首页静态过滤配置\nfunction homeContent(filter) {\n    var filterConfig = ${JSON.stringify(sData, null, 4)};\n    return filterConfig;\n}\n`;
            } else if (schema.isList) {
                let resArray = [];
                if (conf.container && conf.container.sel) {
                    const items = document.querySelectorAll(conf.container.sel);
                    for(let i=0; i<items.length; i++) {
                        let item = items[i], obj = {}, _isEmpty = true;
                        schema.fields.forEach(f => {
                            if (f.id === 'container' || f.global || !conf[f.id].extract) return;
                            let rawVal; if (conf[f.id].extract.type === 'custom') rawVal = conf[f.id].extract.val;
                            else { let targetEl = conf[f.id].sel ? item.querySelector(conf[f.id].sel) : item; rawVal = conf[f.id].extract.type === 'text' ? targetEl?.textContent : conf[f.id].extract.type === 'html' ? targetEl?.innerHTML : conf[f.id].extract.type === 'outerhtml' ? targetEl?.outerHTML : targetEl?.getAttribute(conf[f.id].extract.key); }
                            obj[f.id] = applyFilters(rawVal, conf[f.id].extract.filters); if (obj[f.id] !== '') _isEmpty = false;
                        });
                        if (!_isEmpty) resArray.push(obj);
                    }
                }
                let globalData = {};
                ['pagecount', 'limit', 'total'].forEach(k => {
                    if (conf[k] && conf[k].extract) {
                        let rawVal; if (conf[k].extract.type === 'custom') rawVal = conf[k].extract.val;
                        else { let el = conf[k].sel ? document.querySelector(conf[k].sel) : document; rawVal = conf[k].extract.type === 'text' ? el?.textContent : conf[k].extract.type === 'html' ? el?.innerHTML : conf[k].extract.type === 'outerhtml' ? el?.outerHTML : el?.getAttribute(conf[k].extract.key); }
                        let finalVal = applyFilters(rawVal, conf[k].extract.filters); let parsedNum = parseInt(String(finalVal).match(/\d+/)?.[0]);
                        if (!isNaN(parsedNum)) globalData[k] = parsedNum; else globalData[k] = `[异常] "${finalVal}"`;
                    }
                });
                liveResult = (currentTab === 'category' || currentTab === 'search') ? { code: 1, msg: "数据列表", page: "pg (运行时传入)", pagecount: globalData.pagecount || 99, limit: globalData.limit !== undefined ? globalData.limit : resArray.length, total: globalData.total !== undefined ? globalData.total : resArray.length, list: resArray } : { msg: `匹配到 ${resArray.length} 个项目`, list: resArray };

                if (currentTab === 'home') { tabCode += `function homeVideoContent() {\n    var vod = parseVideoList();\n    return { list: vod };\n}\n\n`; } 
                else if (currentTab === 'category' || currentTab === 'search') {
                    let fName = currentTab === 'category' ? 'categoryContent(tid, pg, filter, extend)' : 'searchContent(wd, pg)';
                    tabCode += `function ${fName} {\n`;
                    ['pagecount', 'limit', 'total'].forEach(k => {
                        if (conf[k] && conf[k].extract) {
                            let pd = conf[k];
                            if (pd.extract.type === 'custom') { tabCode += `    var _${k}_raw = '${(pd.extract.val||'').replace(/'/g, "\\'")}';\n`; } 
                            else {
                                let pq = pd.sel ? `document.querySelector('${pd.sel}')` : `document`;
                                let pExCode = pd.extract.type === 'text' ? `?.textContent` : pd.extract.type === 'html' ? `?.innerHTML` : pd.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${pd.extract.key}')`;
                                tabCode += `    var _${k}_raw = ${pq}${pExCode} || '';\n`;
                            }
                            tabCode += `    var _${k} = _${k}_raw;\n`; tabCode += genFiltersCode(`_${k}`, pd.extract.filters, 4);
                            tabCode += `    _${k} = parseInt(String(_${k}).match(/\\d+/)?.[0]) || 0;\n\n`;
                        }
                    });
                    tabCode += `    var vod = parseVideoList();\n    return {\n        code: 1,\n        msg: "列表",\n        page: typeof pg !== 'undefined' ? pg : 1,\n        pagecount: ${conf.pagecount?.extract ? '_pagecount' : '99'},\n        limit: ${conf.limit?.extract ? '_limit' : 'vod.length'},\n        total: ${conf.total?.extract ? '_total' : 'vod.length'},\n        list: vod\n    };\n}\n\n`;
                }
                if (conf.container && conf.container.sel) tabCode += generateParseListCodeStr(currentTab);

            } else {
                let detailObj = {};
                schema.fields.forEach(f => {
                    if (f.isPlay || !conf[f.id].extract) return;
                    let rawVal; if (conf[f.id].extract.type === 'custom') rawVal = conf[f.id].extract.val;
                    else { let el = document.querySelector(conf[f.id].sel); rawVal = conf[f.id].extract.type === 'text' ? el?.textContent : conf[f.id].extract.type === 'html' ? el?.innerHTML : conf[f.id].extract.type === 'outerhtml' ? el?.outerHTML : el?.getAttribute(conf[f.id].extract.key); }
                    detailObj[f.id] = applyFilters(rawVal, conf[f.id].extract.filters);
                });
                if (conf.vod_play_title && conf.vod_play_url && conf.vod_play_title.extract && conf.vod_play_url.extract) {
                    let playFroms = []; let playUrls = [];
                    let fromNodes = conf.vod_play_from?.extract?.type !== 'custom' && conf.vod_play_from?.sel ? document.querySelectorAll(conf.vod_play_from.sel) : [];
                    let titleNodes = conf.vod_play_title.extract.type !== 'custom' && conf.vod_play_title.sel ? document.querySelectorAll(conf.vod_play_title.sel) : [];
                    let urlNodes = conf.vod_play_url.extract.type !== 'custom' && conf.vod_play_url.sel ? document.querySelectorAll(conf.vod_play_url.sel) : [];
                    let baseNodes = titleNodes.length > 0 ? titleNodes : urlNodes; let epGroups = []; let currentGroup = []; let lastContainer = null;
                    for(let j=0; j<baseNodes.length; j++) { let node = baseNodes[j]; let container = node.closest('ul') || node.closest('div[class*="list"]') || node.closest('.stui-content__playlist') || node.parentElement.parentElement; if (lastContainer && container !== lastContainer) { epGroups.push(currentGroup); currentGroup = []; } currentGroup.push(j); lastContainer = container; } if (currentGroup.length > 0) epGroups.push(currentGroup);
                    let maxLen = fromNodes.length > 0 ? Math.min(fromNodes.length, epGroups.length) : epGroups.length;
                    for(let i=0; i<maxLen; i++) {
                        let fromRaw = conf.vod_play_from?.extract?.type === 'custom' ? conf.vod_play_from.extract.val : (conf.vod_play_from?.extract?.type === 'text' ? fromNodes[i]?.textContent : (conf.vod_play_from?.extract?.type === 'html' ? fromNodes[i]?.innerHTML : (conf.vod_play_from?.extract?.type === 'outerhtml' ? fromNodes[i]?.outerHTML : fromNodes[i]?.getAttribute(conf.vod_play_from?.extract?.key))));
                        let fromName = applyFilters(fromRaw, conf.vod_play_from?.extract?.filters) || '未知线路';
                        let epList = []; let groupIndices = epGroups[i] || [];
                        for(let k=0; k<groupIndices.length; k++) {
                            let j = groupIndices[k];
                            let tRaw = conf.vod_play_title.extract.type === 'custom' ? conf.vod_play_title.extract.val : (conf.vod_play_title.extract.type === 'text' ? titleNodes[j]?.textContent : (conf.vod_play_title.extract.type === 'html' ? titleNodes[j]?.innerHTML : (conf.vod_play_title.extract.type === 'outerhtml' ? titleNodes[j]?.outerHTML : titleNodes[j]?.getAttribute(conf.vod_play_title.extract.key)))); let title = applyFilters(tRaw, conf.vod_play_title.extract.filters);
                            let uRaw = conf.vod_play_url.extract.type === 'custom' ? conf.vod_play_url.extract.val : (conf.vod_play_url.extract.type === 'text' ? urlNodes[j]?.textContent : (conf.vod_play_url.extract.type === 'html' ? urlNodes[j]?.innerHTML : (conf.vod_play_url.extract.type === 'outerhtml' ? urlNodes[j]?.outerHTML : urlNodes[j]?.getAttribute(conf.vod_play_url.extract.key)))); let url = applyFilters(uRaw, conf.vod_play_url.extract.filters);
                            if(title || url) epList.push((title||'未知') + '$' + (url||''));
                        }
                        if (epList.length > 0) { playFroms.push(fromName); playUrls.push(epList.join('#')); }
                    }
                    detailObj.vod_play_from = playFroms.join('$$$'); detailObj.vod_play_url = playUrls.join('$$$');
                }
                liveResult = { msg: '详情页解析成功', list: [detailObj] };

                tabCode += `function detailContent(ids) {\n    var detail = {};\n`;
                schema.fields.forEach(f => {
                    if (f.isPlay || !conf[f.id].extract) return;
                    let dt = conf[f.id];
                    if (dt.extract.type === 'custom') { tabCode += `    detail.${f.id} = '${(dt.extract.val||'').replace(/'/g, "\\'")}';\n`; } 
                    else { let qc = `document.querySelector('${dt.sel}')`; let exCode = dt.extract.type === 'text' ? `?.textContent` : dt.extract.type === 'html' ? `?.innerHTML` : dt.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${dt.extract.key}')`; tabCode += `    detail.${f.id} = ${qc}${exCode} || '';\n`; }
                    tabCode += genFiltersCode(`detail.${f.id}`, dt.extract.filters, 4); tabCode += `    detail.${f.id} = String(detail.${f.id}).trim();\n\n`;
                });
                if (conf.vod_play_title && conf.vod_play_url && conf.vod_play_title.extract && conf.vod_play_url.extract) {
                    tabCode += `    var playFroms = []; var playUrls = [];\n    var fromNodes = ${conf.vod_play_from && conf.vod_play_from.extract && conf.vod_play_from.extract.type !== 'custom' && conf.vod_play_from.sel ? `document.querySelectorAll('${conf.vod_play_from.sel}')` : `[]`};\n    var titleNodes = ${conf.vod_play_title.extract.type !== 'custom' && conf.vod_play_title.sel ? `document.querySelectorAll('${conf.vod_play_title.sel}')` : `[]`};\n    var urlNodes = ${conf.vod_play_url.extract.type !== 'custom' && conf.vod_play_url.sel ? `document.querySelectorAll('${conf.vod_play_url.sel}')` : `[]`};\n    var baseNodes = titleNodes.length > 0 ? titleNodes : urlNodes; var epGroups = []; var currentGroup = []; var lastContainer = null;\n    for(var j=0; j<baseNodes.length; j++) { var node = baseNodes[j]; var container = node.closest('ul') || node.closest('div[class*="list"]') || node.closest('.stui-content__playlist') || node.parentElement.parentElement;\n        if (lastContainer && container !== lastContainer) { epGroups.push(currentGroup); currentGroup = []; } currentGroup.push(j); lastContainer = container; } if (currentGroup.length > 0) epGroups.push(currentGroup);\n    var maxLen = fromNodes.length > 0 ? Math.min(fromNodes.length, epGroups.length) : epGroups.length;\n    for(var i=0; i<maxLen; i++) {\n`;
                    if (conf.vod_play_from && conf.vod_play_from.extract) {
                        if (conf.vod_play_from.extract.type === 'custom') { tabCode += `        var fromName = '${(conf.vod_play_from.extract.val||'').replace(/'/g, "\\'")}';\n`; } 
                        else { let fEx = conf.vod_play_from.extract.type === 'text' ? `?.textContent` : conf.vod_play_from.extract.type === 'html' ? `?.innerHTML` : conf.vod_play_from.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${conf.vod_play_from.extract.key}')`; tabCode += `        var fromName = fromNodes[i]${fEx} || '未知线路';\n`; }
                        tabCode += genFiltersCode('fromName', conf.vod_play_from.extract.filters, 8); tabCode += `        fromName = String(fromName).trim() || '未知线路';\n\n`;
                    } else { tabCode += `        var fromName = '未知线路';\n\n`; }
                    tabCode += `        var epList = []; var groupIndices = epGroups[i] || [];\n        for(var k=0; k<groupIndices.length; k++) { var gIdx = groupIndices[k];\n`;
                    if (conf.vod_play_title.extract.type === 'custom') { tabCode += `            var epTitle = '${(conf.vod_play_title.extract.val||'').replace(/'/g, "\\'")}';\n`; } 
                    else { let tEx = conf.vod_play_title.extract.type === 'text' ? `?.textContent` : conf.vod_play_title.extract.type === 'html' ? `?.innerHTML` : conf.vod_play_title.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${conf.vod_play_title.extract.key}')`; tabCode += `            var epTitle = titleNodes[gIdx]${tEx} || '';\n`; }
                    tabCode += genFiltersCode('epTitle', conf.vod_play_title.extract.filters, 12); tabCode += `            epTitle = String(epTitle).trim();\n\n`;
                    if (conf.vod_play_url.extract.type === 'custom') { tabCode += `            var epUrl = '${(conf.vod_play_url.extract.val||'').replace(/'/g, "\\'")}';\n`; } 
                    else { let uEx = conf.vod_play_url.extract.type === 'text' ? `?.textContent` : conf.vod_play_url.extract.type === 'html' ? `?.innerHTML` : conf.vod_play_url.extract.type === 'outerhtml' ? `?.outerHTML` : `?.getAttribute('${conf.vod_play_url.extract.key}')`; tabCode += `            var epUrl = urlNodes[gIdx]${uEx} || '';\n`; }
                    tabCode += genFiltersCode('epUrl', conf.vod_play_url.extract.filters, 12); tabCode += `            epUrl = String(epUrl).trim();\n\n`;
                    tabCode += `            if(epTitle || epUrl) epList.push((epTitle||'未知') + '$' + epUrl);\n        }\n        if (epList.length > 0) { playFroms.push(fromName); playUrls.push(epList.join('#')); }\n    }\n    detail.vod_play_from = playFroms.join('$$$');\n    detail.vod_play_url = playUrls.join('$$$');\n\n`;
                }
                tabCode += `    return { list: [detail] };\n}\n`;
            }
            UI.testResult.textContent = typeof liveResult === 'string' ? liveResult : JSON.stringify(liveResult, null, 2);
            UI.codeOutput.value = tabCode; UI.outTabs[0].click(); 
        } catch(e) {
            UI.testResult.textContent = '[错误] 提取出错: ' + e.message; UI.outTabs[0].click();
        }
    };

    // =========================================================================
    // === [BLOCK 7: 面板开关与系统启动] ===
    // =========================================================================
    UI.fab.onclick = () => { 
        UI.panel.style.display = 'flex'; 
        setTimeout(() => UI.panel.classList.add('show'), 10); 
        UI.fab.style.display = 'none'; 
        if (currentTab === 'filter') renderFilterTab(); else renderTaskList(); 
    };

    shadow.querySelector('#sp_close_panel').onclick = () => { 
        UI.panel.classList.remove('show'); 
        setTimeout(() => { 
            UI.panel.style.display = 'none'; 
            UI.fab.style.display = 'flex'; 
            togglePicking(false); 
            resetPanelTitle(); 
            UI.panel.classList.remove('picking-mode'); 
            UI.panel.style.cursor = 'default';
            currentPickingFieldId = null; 
            currentFilterPicking = null; 
        }, 300); 
    };

    console.log("[成功] Spider-UI V44 启动完毕 (局部热更 + 完美筛选树状版)。");
})();