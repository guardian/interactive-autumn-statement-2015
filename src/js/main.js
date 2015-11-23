import iframeMessenger from 'guardian/iframe-messenger'
import reqwest from 'reqwest'
import doT from 'olado/doT'
import treemap from './lib/treemap'

import mainHTML from './text/main.html!text'
import spending from './data/spending.tsv!tsv'

var templateFn = doT.template(mainHTML);

var departmentCosts = {};
var departmentName = '';
spending.forEach(spend => {
    if (spend.name) {
        spend.cost = parseInt(spend.cost);

        if (departmentName) {
            if (spend.cost > 0) { // TODO: TEMP
                departmentCosts[departmentName].divisions.push(spend);
            }
        } else {
            departmentName = spend.name;
            departmentCosts[departmentName] = {'cost': spend.cost, 'divisions': []};
        }
    } else {
        departmentName = '';
    }
});

const WIDTH = 100, HEIGHT = 50;

var departments = Object.keys(departmentCosts)
    .filter(name => departmentCosts[name].cost > 0)
    .map(name => {
        var department = departmentCosts[name];
        return {
            name,
            'cost': department.cost,
            'treemap': treemap(department.divisions, division => division.cost, WIDTH, HEIGHT)
        };
    })
    .sort((a, b) => b.cost - a.cost);

var governmentTreemap = treemap(departments, department => department.cost, WIDTH, HEIGHT);

function getBoxWidth(area) {
    var height = Math.sqrt(area / (WIDTH  / HEIGHT));
    return area / height;
}

function bound(v, min, max) {
    return Math.max(min, Math.min(v, max));
}

export function init(el, context, config, mediator) {
    iframeMessenger.enableAutoResize();

    //el.addEventListener('mousemove', evt => console.log(evt));

    departments.forEach((department, i) => {
        var box = governmentTreemap[i].box;
        department.padding = WIDTH - getBoxWidth(box.width * box.height);
    });

    var sections = [{'name': 'Goverment overview', 'treemap': governmentTreemap}].concat(departments);

    sections.forEach(section => {
        //var cut = 30;
        section.cut = getBoxWidth(WIDTH * HEIGHT * 10 / 100);
    });

    el.innerHTML = templateFn({sections});

    [].slice.apply(el.querySelectorAll('.js-section')).forEach(sectionEl => {
        var cutEl = sectionEl.querySelector('.js-cut');
        sectionEl.addEventListener('mousemove', evt => {
            var rect = sectionEl.getBoundingClientRect();
            var cutRect = cutEl.getBoundingClientRect();
            var x = evt.clientX - rect.left,
                y = evt.clientY - rect.top;
            var left = bound(x - cutRect.width / 2, 0, rect.width - cutRect.width);
            var top = bound(y - cutRect.height / 2, 0, rect.height - cutRect.height);

            cutEl.style.left = (left / rect.width * 100) + '%';
            cutEl.style.top = (top / rect.height * 100) + '%';
        });
    });
}
