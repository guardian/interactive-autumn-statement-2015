import './polyfill/classList'

import iframeMessenger from 'guardian/iframe-messenger'
import reqwest from 'reqwest'
import doT from 'olado/doT'
import sheetURL from './lib/sheetURL'
import treemap from './lib/treemap'

import mainHTML from './text/main.html!text'
import tmeData from './data/tme.tsv!tsv'
import rdelData from './data/rdel.tsv!tsv'
import ameData from './data/ame.tsv!tsv'
import cdelData from './data/cdel.tsv!tsv'
import welfareData from './data/welfare.tsv!tsv'


const tmeColors = [['005689', '00605D'], ['c05303', 'f98239']];
const rdelColors = ['00427a', '005688', '4982b8', '81b0de', 'b2e1f8', '0094ad', '4bc5de', '9bd9e7', 'c4e7ef', '3b4a5c', '657689', '92a3b7', 'c5d6eb', '7ea6c0', '4a788e', '79a6bd', 'a9d7ef'];
const ameColors = ['590000', '892500', 'c05303', 'f98239', 'ffb367', 'ffe697', '8f4000', 'c66c00', 'ff9b0b', 'ffcc4b', '781100', 'ad4300', 'e6711b', 'ffa14d', 'ffd37c', '915e00', 'c78b00', 'ffbb00', 'ffed4d', 'c89d0f'];
const cdelColors = ['003800', '1c6326', '4d9150', '7dc27d', 'aef5ad', '475400', '778000', 'a9af2b', 'dde15e', '475400', '00605d', '258e8a', '7aa73a', 'acd969', '5ebfba', '92f2ec', 'c6ffff', '437700', '76a600', 'aad801', 'dfff50', '4a7801'];

const RATIO = 2, WIDTH = 100, HEIGHT = WIDTH / RATIO;
const SHEET_URL = sheetURL('1UkgqAS1NJPoiLlCZHn4p7nR0fXe8rW9XDQddk-_jUig', true); // TODO: disable test

var $ = (el, s) => el.querySelector(s);
var $$ = (el, s) => [].slice.apply(el.querySelectorAll(s));

var templateFn = doT.template(mainHTML);

function getBox(area, ratioWH) {
    var height = Math.sqrt(area / ratioWH);
    return [area / height, height];
}

function treemap2(data, colors) {
    var map = treemap(data, d => parseFloat(d.cost), WIDTH, HEIGHT);
    map.forEach((m, i) => m.obj.color = colors[i % colors.length]);
    return map;
};

// Hack treemap for TME data
tmeData.forEach((d, i) => {
    d.resource = parseFloat(d.resource);
    d.capital = parseFloat(d.capital);
    d.colors = tmeColors[i];
});

var tmeTreemap = treemap(tmeData, d => d.resource + d.capital, WIDTH, HEIGHT, true).map(d => {
    var {box, obj} = d;
    var area = box.width * box.height * (obj.capital / (obj.resource + obj.capital));
    var [width, height] = getBox(area, 1);

    return [
        {
            'box': box,
            'obj': {'name': 'Resource ' + obj.name, 'cost': obj.resource, 'color': obj.colors[0],
                'new_cost': obj.new_resource}
        },
        {
            'box': {'x': box.x + box.width - width, 'y': box.y + box.height - height, width, height},
            'obj': {'name': 'Capital ' + obj.name, 'cost': obj.capital, 'color': obj.colors[1],
                'new_cost': obj.new_capital}
        }
    ];
}).reduce((a, b) => a.concat(b));

// Add sub-treemap to AME welfare spending
var ameTreemap = treemap2(ameData, ameColors.slice(6));
var welfareDivision = ameTreemap[0]; // TODO: more robust search for welfare division?
var welfareTreemap = treemap(welfareData, d => parseFloat(d.cost), welfareDivision.box.width, welfareDivision.box.height);

welfareDivision.obj.special = 'welfare'

welfareTreemap.forEach((d, i) => {
    d.obj.color = ameColors[i];
});

var treemaps = {
    'tme': tmeTreemap,
    'rdel': treemap2(rdelData, rdelColors),
    'ame': ameTreemap.concat(welfareTreemap),
    'cdel': treemap2(cdelData, cdelColors)
};

function app(el, sections) {
    el.innerHTML = templateFn({RATIO, sections, treemaps});

    $$(el, '.js-treemap').forEach(treemapEl => {
        var treemap = treemaps[treemapEl.getAttribute('data-map')];

        $$(treemapEl, '.js-cut').forEach((cutEl, divisionNo) => {
            var {box, obj} = treemap[divisionNo];
            var cut = obj.new_cost / obj.cost;
            var [width, height] = getBox(box.width * box.height * cut, box.width / box.height);
            var lr = (box.width - width) / 2 * WIDTH / box.width;
            var tb = (box.height - height) / 2 * HEIGHT / box.height;

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
                if (section.map) {
                    section.treemap = treemaps[section.map];
                    section.total = section.treemap.reduce((total, d) => total + parseFloat(d.obj.cost), 0);
                    if (section.map === 'ame') {
                        section.total -= parseFloat(welfareDivision.obj.cost);
                    }
                }
            });

            app(el, sections)
        }
    });
}
