var Editor = Editor || {};

class Skin {
    constructor(_name) {
        this._meta = {};
        this._meta.name = _name;
        this._meta.options = {};
    }

    static ParseIni(content) {
        var skin = {};
        var keyValReg = /^([a-zA-Z0-9]+)[ ]*:[ ]*(.+)$/;
        content.toString().split(/[\n\r]+/).forEach(function(line) {
            line = line.toString().trim();
            if (!line) {
                return;
            }
            var match = keyValReg.exec(line);
            if (match) { skin[match[1]] = match[2]; }
        });

        return skin;
    }

    static LoadSkin(name, callback, elements) {
        var skin = new Skin(name);
        elements = elements || ['sliderb0', 'sliderfollowcircle', /*'sliderstartcircle', 'sliderstartcircleoverlay', 'sliderendcircle', 'sliderendcircleoverlay',*/ 'sliderscorepoint',
            'cursor', 'cursortrail', 'hitcircle', 'hitcircleoverlay', 'approachcircle',
            'default-0', 'default-1', 'default-2', 'default-3', 'default-4', 'default-5', 'default-6', 'default-7', 'default-8', 'default-9',
            'spinner-bottom', 'spinner-top', 'spinner-middle', 'spinner-middle2',
        ];

        $.get(`../Skins/${name}/skin.ini`, function(ini) {
            skin._meta.options = Skin.ParseIni(ini);
            (function next(i) {
                if (i < elements.length) {
                    skin[elements[i]] = new Image();
                    skin[elements[i]].src = `../Skins/${skin._meta.name}/${elements[i]}.png`;
                    skin[elements[i]].onload = function() {
                        next(i + 1);
                    };
                    skin[elements[i]].onerror = function() {
                        next(i + 1);
                    };
                } else {
                    var n = 0;
                    var loaded = function() {
                        n++;
                        //status = "Loading Skin... " + (85 + n / 2).toFixed(2) + "%";
                        if (n >= 30) {
                            //status = "Loading Skin...100%";
                            callback(skin);
                        }
                    };
                    if (skin._meta.options.HitCirclePrefix && !skin[skin._meta.options.HitCirclePrefix + '-0']) {
                        for (var i = 0; i < 10; i++) {
                            skin[skin._meta.options.HitCirclePrefix + '-' + i] = new Image();
                            skin[skin._meta.options.HitCirclePrefix + '-' + i].src = `../Skins/${skin._meta.name}/${skin._meta.options.HitCirclePrefix}-${i}.png`;
                            skin[skin._meta.options.HitCirclePrefix + '-' + i].onload = function() {
                                loaded();
                            };
                        }
                    } else n += 10;
                    if (skin._meta.options.ScorePrefix && !skin[skin._meta.options.ScorePrefix + '-0']) {
                        for (var i = 0; i < 10; i++) {
                            skin[skin._meta.options.ScorePrefix + '-' + i] = new Image();
                            skin[skin._meta.options.ScorePrefix + '-' + i].src = `../Skins/${skin._meta.name}/${skin._meta.options.ScorePrefix}-${i}.png`;
                            skin[skin._meta.options.ScorePrefix + '-' + i].onload = function() {
                                loaded();
                            };
                        }
                    } else n += 10;
                    if (skin._meta.options.ComboPrefix && !skin[skin._meta.options.ComboPrefix + '-0']) {
                        for (var i = 0; i < 10; i++) {
                            skin[skin._meta.options.ComboPrefix + '-' + i] = new Image();
                            skin[skin._meta.options.ComboPrefix + '-' + i].src = `../Skins/${skin._meta.name}/${skin._meta.options.ComboPrefix}-${i}.png`;
                            skin[skin._meta.options.ComboPrefix + '-' + i].onload = function() {
                                loaded();
                            };
                        }
                    } else n += 10;;
                }
            })(0);
        });
    }

    addComboNumber(digits, n) {
        return this['default-' + n] = concatImages(digits, parseInt(this._meta.options.HitCircleOverlap || 2, 10));
    };

    addComboColor(col) {
        Editor.cols.push(col);
        var tintelements = ['hitcircle', 'approachcircle', 'sliderb0'];
        for (var i = 0; i < tintelements.length; i++) {
            if (tintelements[i] == 'sliderb0') {
                this[tintelements[i] + (Editor.cols.length - 1)] = tint(this[tintelements[i]], [0, 0, 0]);
            } else
                this[tintelements[i] + (Editor.cols.length - 1)] = tint(this[tintelements[i]], col);
        }
    };
}

if (typeof module !== "undefined") {
    module.exports = Skin;
} else {
    window.Skin = Editor.Skin = Skin;
}
