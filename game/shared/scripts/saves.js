// Save/load page presentation. The progress module owns formats and storage keys.
function renderSaveSlots() {
    try {
        GameProgress.listSlots().forEach(function (slot, index) {
            var name = document.getElementById('gamename' + index);
            var time = document.getElementById('time' + index);
            if (slot.status === 'ready') {
                name.textContent = slot.snapshot.progress.chapterName;
                var savedAt = slot.snapshot.savedAt;
                var date = savedAt && new Date(savedAt);
                time.textContent = !savedAt ? '保存时间未知' : savedAt.includes('T') && !Number.isNaN(date.getTime())
                    ? date.toLocaleString('zh-CN', { hour12: false }) : savedAt;
            } else {
                name.textContent = slot.status === 'empty' ? '空档位' : '存档无法读取';
                time.textContent = slot.status === 'empty' ? '' : slot.message;
            }
        });
    } catch (error) {
        alert(error.message);
    }
}

function Save(situation) {
    try {
        GameProgress.saveSlot(situation);
        renderSaveSlots();
        alert('保存成功');
    } catch (error) {
        alert(error.message);
    }
}

function Load(situation) {
    try {
        GameProgress.restoreSlot(situation);
        window.location.href = '../map/index.html';
    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener('DOMContentLoaded', renderSaveSlots);
