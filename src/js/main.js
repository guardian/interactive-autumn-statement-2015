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

const width = 100, height = 50;

var departments = Object.keys(departmentCosts)
    .filter(name => departmentCosts[name].cost > 0)
    .map(name => {
        var department = departmentCosts[name];
        return {
            name,
            'cost': department.cost,
            'treemap': treemap(department.divisions, division => division.cost, width, height)
        };
    })
    .sort((a, b) => b.cost - a.cost);

var governmentTreemap = treemap(departments, department => department.cost, width, height);

export function init(el, context, config, mediator) {
    iframeMessenger.enableAutoResize();

    departments.forEach((department, i) => {
        var box = governmentTreemap[i].box;
        var area = box.width * box.height;
        var width = Math.sqrt(area / 2);
        console.log(area, box, width, area / width);

        department.padding = 100 - area / width;
    });

    var sections = [{'name': 'Goverment overview', 'treemap': governmentTreemap}].concat(departments);

    el.innerHTML = templateFn({sections});
}
