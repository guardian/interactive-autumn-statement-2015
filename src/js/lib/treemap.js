function sum(array) {
    return array.reduce((a, b) => a + b, 0);
}

function Rect(width, height, x, y) {
    var fixed = Math.min(width, height);
    var vertical = width > height;

    this.layoutRow = function (areas) {
        var len2 = sum(areas) / fixed;

        var agg = vertical ? y : x;
        var boxes = areas.map(area => {
            var len1 = area / len2, offset = agg;
            agg += len1;
            return vertical ?
                {'x': x, 'y': offset, 'width': len2, 'height': len1} :
                {'x': offset, 'y': y, 'width': len1, 'height': len2};
        });

        var subRect = vertical ?
            new Rect(width - len2, height, x + len2, y) :
            new Rect(width, height - len2, x, y + len2);

        return [boxes, subRect];
    };

    this.fixed = fixed;
}

function worstRatio(areas, fixed) {
    var minArea = Math.min.apply(null, areas);
    var maxArea = Math.max.apply(null, areas);
    var s = sum(areas);
    var sSqr = s * s;
    var wSqr = fixed * fixed;
    return Math.max((wSqr * maxArea) / sSqr, sSqr / (wSqr * minArea));
}

function squarify(areas, row, rect) {
    if (!areas.length) return rect.layoutRow(row)[0];

    var newRow = row.concat(areas[0]);
    if (row.length === 0 || worstRatio(row, rect.fixed) > worstRatio(newRow, rect.fixed)) {
        return squarify(areas.slice(1), newRow, rect);
    } else {
        var tmp = rect.layoutRow(row);
        var rowBoxes = tmp[0], newRect = tmp[1];
        return rowBoxes.concat(squarify(areas, [], newRect));
    }
}

export default function treemap(data, fn, width, height, nosort=false) {
    var totalArea = width * height;
    var sorted = data.slice()
    if (!nosort) sorted.sort((a, b) => fn(b) - fn(a));

    var numbers = sorted.map(fn);
    var total = sum(numbers);
    var areas = numbers.map(n => n / total * totalArea);

    return squarify(areas, [], new Rect(width, height, 0, 0)).map((box, i) => {
        return {box, 'obj': sorted[i]};
    });
}
