import './polyfill/classList'

import iframeMessenger from 'guardian/iframe-messenger'
import reqwest from 'reqwest'
import doT from 'olado/doT'
import sheetURL from './lib/sheetURL'
import treemap from './lib/treemap'

import mainHTML from './text/main.html!text'
import tmeData from './data/tme.tsv!tsv'
import rdelData from './data/rdel.tsv!tsv'
import cdelData from './data/cdel.tsv!tsv'

const RATIO = 2, WIDTH = 100, HEIGHT = WIDTH / RATIO;
const SHEET_URL = sheetURL('1UkgqAS1NJPoiLlCZHn4p7nR0fXe8rW9XDQddk-_jUig', true); // TODO: disable test

var $ = (el, s) => el.querySelector(s);
var $$ = (el, s) => [].slice.apply(el.querySelectorAll(s));

var templateFn = doT.template(mainHTML);

var tm = (data, colors) => {
    var map = treemap(data, d => parseFloat(d.cost), WIDTH, HEIGHT);
    map.forEach((m, i) => m.obj.color = colors[i]);
    return map;
};

var treemaps = {
    'tme': tm(tmeData, ['00427a', '5f1400', '00605d']),
    'rdel': tm(rdelData, ['00427a', '005688', '4982b8', '81b0de', 'b2e1f8', '0094ad', '4bc5de', '9bd9e7', 'c4e7ef', '3b4a5c', '657689', '92a3b7', 'c5d6eb', '7ea6c0', '4a788e', '79a6bd', 'a9d7ef']),
/* TODO */    'ame': tm(rdelData, ['5f1400', '8f4000', 'c66c00', 'ff9b0a', 'ffcc4b', 'ffed4e', 'ffff82', 'ffffb6', 'ffffe3']),
    'cdel': tm(cdelData, ['00605d', '258e8a', '5bb8b3', '91f2ec'])
};

function getBox(area, ratioWH) {
    var height = Math.sqrt(area / ratioWH);
    return [area / height, height];
}

function app(el, sections) {
    el.innerHTML = templateFn({RATIO, sections, treemaps});

    $$(el, '.js-treemap').forEach(treemapEl => {
        var treemap = treemaps[treemapEl.getAttribute('data-map')];

        $$(treemapEl, '.js-cut').forEach((cutEl, divisionNo) => {
            var division = treemap[divisionNo];
            var box = division.box;
            var cut = Math.random() * 0.9; // TODO: actual cut
            var [width, height] = getBox(box.width * box.height * cut, box.width / box.height);
            var lr = box.width / ((box.width - width) / 2);
            var tb = box.height / ((box.height - height) / 2);

            cutEl.style.left = cutEl.style.right = lr + '%';
            cutEl.style.top = cutEl.style.bottom = tb + '%';
        });

        $(treemapEl, '.js-toggle').addEventListener('click', () => {
            treemapEl.classList.toggle('is-hiding-cuts');
        });
    });
}

export function init(el, context, config, mediator) {
    iframeMessenger.enableAutoResize();

    reqwest({
        'url': SHEET_URL,
        'type': 'json',
        'crossOrigin': true,
        'success': resp => {
            var sections = resp.sections;
            sections.forEach(section => {
                if (section.copy) {
                    section.copy = section.copy.replace(/[\r\n]+/, '\n').split('\n');
                }
            });

            app(el, sections)
        }
    });
}
