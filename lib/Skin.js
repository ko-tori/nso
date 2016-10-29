var Editor = Editor || {};

class Skin {
    constructor(_name) {
        this._meta = {};
        this._meta.name = _name;
        this._meta.opts = {};
    }
    
    static loadSkin = function(callback, elements, name) {
        var skin = new Skin(name);
        //status = "Loading Skin... 0%";
        var numloaded = 0;
        elements = elements || ['sliderb0', 'sliderfollowcircle', 'sliderstartcircle', 'sliderstartcircleoverlay', 'sliderendcircle', 'sliderendcircleoverlay', 'sliderscorepoint',
            'cursor', 'cursortrail', 'hitcircle', 'hitcircleoverlay', 'approachcircle',
            'default-0', 'default-1', 'default-2', 'default-3', 'default-4', 'default-5', 'default-6', 'default-7', 'default-8', 'default-9',
            'spinner-bottom', 'spinner-top', 'spinner-middle', 'spinner-middle2',
        ];
        var loaded = function() {
            numloaded++;
            //status = "Loading Skin... " + (85 * numloaded / elements.length).toFixed(2) + "%";
            if (numloaded >= elements.length) {
                $.getJSON('/parseskin/' + skin._meta.name, function(result) {
                    skin._meta.options = result;
                    var numloaded2 = 0;
                    var loaded2 = function() {
                        numloaded2++;
                        //status = "Loading Skin... " + (85 + numloaded2 / 2).toFixed(2) + "%";
                        if (numloaded2 >= 30) {
                            //status = "Loading Skin...100%";
                            callback(skin);
                        }
                    };
                    if (skin._meta.options.HitCirclePrefix && !skin[skin._meta.options.HitCirclePrefix + '-0']) {
                        for (var i = 0; i < 10; i++) {
                            skin[skin._meta.options.HitCirclePrefix + '-' + i] = new Image();
                            skin[skin._meta.options.HitCirclePrefix + '-' + i].src = 'skin/' + skin._meta.name + '/' + skin._meta.options.HitCirclePrefix + '-' + i + '.png';
                            skin[skin._meta.options.HitCirclePrefix + '-' + i].onload = function() {
                                loaded2();
                            };
                        }
                    }
                    else numloaded2 += 10;
                    if (skin._meta.options.ScorePrefix && !skin[skin._meta.options.ScorePrefix + '-0']) {
                        for (var i = 0; i < 10; i++) {
                            skin[skin._meta.options.ScorePrefix + '-' + i] = new Image();
                            skin[skin._meta.options.ScorePrefix + '-' + i].src = 'skin/' + skin._meta.name + '/' + skin._meta.options.ScorePrefix + '-' + i + '.png';
                            skin[skin._meta.options.ScorePrefix + '-' + i].onload = function() {
                                loaded2();
                            };
                        }
                    }
                    else numloaded2 += 10;
                    if (skin._meta.options.ComboPrefix && !skin[skin._meta.options.ComboPrefix + '-0']) {
                        for (var i = 0; i < 10; i++) {
                            skin[skin._meta.options.ComboPrefix + '-' + i] = new Image();
                            skin[skin._meta.options.ComboPrefix + '-' + i].src = 'skin/' + skin._meta.name + '/' + skin._meta.options.ComboPrefix + '-' + i + '.png';
                            skin[skin._meta.options.ComboPrefix + '-' + i].onload = function() {
                                loaded2();
                            };
                        }
                    }
                    else numloaded2 += 10;
                });
            }
        };
        for (var i = 0; i < elements.length; i++) {
            skin[elements[i]] = new Image();
            skin[elements[i]].src = 'skin/' + skin._meta.name + '/' + elements[i] + '.png';
            skin[elements[i]].onload = function() {
                loaded();
            };
            skin[elements[i]].onerror = function() {
                loaded();
            };
        }
    };
}

window.Skin = Editor.Skin = Skin;