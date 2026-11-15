(function () {
    'use strict';

    const storage = window.localStorage;
    storage.setItem('username', 'test');
    if (storage.getItem('testachievement') === null) {
        storage.setItem('testachievement', JSON.stringify({
            ach1: 0, ach2: 0, ach3: 0, ach4: 0,
            ach5: 0, ach6: 0, ach7: 0, ach8: 0,
        }));
    }
    if (storage.getItem('testflag') === null) storage.setItem('testflag', '0');
})();
