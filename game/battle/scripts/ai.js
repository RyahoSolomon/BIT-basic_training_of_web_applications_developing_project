// 页面接入：AI 规则决定动作，这里执行移动/伤害并显示行动标记，等待玩家确认。
function computer_operate() {
    const actor = units[current_act_unit];
    if (actor.AI_type !== 'normal' && actor.AI_type !== 'wait') return;

    const origin = { x: actor.x, y: actor.y };
    const action = AiRules.chooseAction(read_battle_state(), current_act_unit);
    if (action.type !== 'wait') {
        actor.x = action.x;
        actor.y = action.y;
    }
    if (action.type === 'attack') {
        units[action.targetId].get_hurt(actor.attack, current_act_unit);
    }

    showAiActionMarkers(origin, action);
    units_display_update();
    load_items();
    initial_confirm();
}

function showAiActionMarkers(origin, action) {
    const container = document.getElementById('selected_box');
    container.innerHTML = '';
    appendAiMarker(container, 'move_from_mark', 'assets/images/mask/selected.png', origin);
    if (action.type !== 'wait') {
        appendAiMarker(container, 'move_to_mark', 'assets/images/mask/selected.png', action);
    }
    if (action.type === 'attack') {
        appendAiMarker(container, 'attack_target_mark', 'assets/images/mask/computer-attack-target.png', units[action.targetId]);
    }
}

function appendAiMarker(container, id, source, position) {
    const marker = document.createElement('img');
    marker.id = id;
    marker.src = source;
    marker.style.position = 'absolute';
    marker.style.top = position.x * 64 - 720;
    marker.style.left = position.y * 64;
    container.appendChild(marker);
}
