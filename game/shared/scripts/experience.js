(function (root) {
    const experience = Object.freeze({ thresholds: Object.freeze([20, 48, 96, 144, 216]) });
    if (typeof module === 'object' && module.exports) module.exports = experience;
    else root.GameExperience = experience;
})(typeof window === 'undefined' ? globalThis : window);
