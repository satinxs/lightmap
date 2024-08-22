const img = document.getElementById("bg");
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

class FrameBuffer {
    constructor(width, height) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        this.ctx = this.canvas.getContext('2d');
    }
}

const round = n => ((n * 1000) >> 0) / 1000;

const scale = ([x, y], s) => [x * s, y * s];
const vector = ([a, b], [c, d]) => [c - a, d - b];
const getAngle = ([x, y], [a, b], [c, d]) => Math.atan2(a - x, b - y) - Math.atan2(c - x, d - y);
const rotate = ([x1, y1], [x2, y2], angle) => {
    const [a, b, cos, sin] = [x2 - x1, y2 - y1, Math.cos(angle), Math.sin(angle)];
    return [x1 + a * cos - b * sin, y1 + a * sin + b * cos];
};

const sum = ([x1, y1], [x2, y2]) => [x1 + x2, y1 + y2];
const normalize = ([x, y]) => [x / Math.hypot(x, y), y / Math.hypot(x, y)];

const chair = [
    [150, 200],
    [[10, 0], [0, 50], [30, 0], [0, 30], [-10, 0], [0, -20], [-20, 0], [0, 20], [-10, 0], [0, -80]]
        .map(v => scale(v, 2))
];

const absolutize = poly => {
    let last = poly[0];

    const points = [];

    for (const d of poly[1]) {
        const n = [last[0] + d[0], last[1] + d[1]];
        points.push(n);
        last = n;
    }

    return points;
};

const distance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersect([[x1, y1], [x2, y2]], [[x3, y3], [x4, y4]]) {
    const
        [adx, ady, bdx, bdy, aby, abx] = [x2 - x1, y2 - y1, x4 - x3, y4 - y3, y1 - y3, x1 - x3],
        denominator = bdy * adx - bdx * ady,
        ua = (bdx * aby - bdy * abx) / denominator,
        ub = (adx * aby - ady * abx) / denominator
        ;

    //TODO: Maybe skip this next check? :)
    // Check if none of the lines are of length 0
    // if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) return false;

    // Lines are parallel (denominator is 0) or
    // is the intersection along the segments
    return denominator === 0 || ua < 0 || ua > 1 || ub < 0 || ub > 1
        ? false
        : [x1 + ua * adx, y1 + ua * ady];
    // Return a object with the x and y coordinates of the intersection
}

const findIntersection = (ray, points) => {
    let closestPoint = ray[1];
    let closestDistance = distance(...ray[0], ...ray[1]);

    for (let i = 1; i < points.length; i++) {
        const result = intersect(ray, points.slice(i - 1, i + 1));

        if (result) {
            const d = distance(...ray[0], ...result);

            if (d < closestDistance) {
                closestPoint = result;
                closestDistance = d;
            }
        }
    }

    return closestPoint;
};

const Tau = Math.PI * 2;
const mouse = [500, 500];
const keys = {};

const drawPoly = (ctx, poly) => {
    ctx.save();
    ctx.translate(...poly[0]);

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(0, 0);

    let last = [0, 0];
    for (const dt of poly[1]) {
        const p = [last[0] + dt[0], last[1] + dt[1]];

        ctx.lineTo(...p);
        last = p;
    }

    ctx.fill();
    ctx.restore();
};

window.onload = () => {
    document.onmousemove = ev => {
        const { x, y } = canvas.getBoundingClientRect();

        mouse[0] = ev.clientX - x;
        mouse[1] = ev.clientY - y;
    };

    document.onkeydown = ev => keys[ev.code] = true;
    document.onkeyup = ev => keys[ev.code] = false;

    const lightmap = new FrameBuffer(canvas.width, canvas.height);

    let timestamp = +new Date - 10;

    let lightPosition = [100, 100];

    const brightnessBar = document.getElementById('brightness');

    const loop = (ts) => {
        lightmap.ctx.fillStyle = `rgb(${brightnessBar.value},${brightnessBar.value},${brightnessBar.value})`;
        lightmap.ctx.fillRect(0, 0, lightmap.canvas.width, lightmap.canvas.height);

        const angle = -Math.atan2(mouse[0] - lightPosition[0], mouse[1] - lightPosition[1]) + Tau / 4;

        drawCone(lightmap.ctx, lightPosition[0], lightPosition[1], 200, Tau / 8, angle, lightmap.ctx.fillStyle);

        ctx.drawImage(img, -120, 0);

        drawPoly(ctx, chair);

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(lightmap.canvas, 0, 0);
        ctx.restore();

        const target = sum(lightPosition, scale(normalize(vector(lightPosition, mouse)), 200));
        const ray1 = rotate(lightPosition, target, -Tau / 16);
        const ray2 = rotate(lightPosition, target, Tau / 16);

        const points = absolutize(chair);
        const rays = [target, ray1, ray2, ...points].map(v => [lightPosition, v]);

        for (const ray of rays) {
            const rayAngle = getAngle(ray[0], mouse, ray[1]);

            if (Math.abs(rayAngle) > Tau / 16) {
                continue;
            }

            const result = findIntersection(ray, points);

            if (result) {
                ctx.beginPath();
                ctx.arc(...result, 4, 0, Tau);
                ctx.fillStyle = 'green';
                ctx.fill();
            }

            ctx.strokeStyle = 'green';
            ctx.beginPath();
            ctx.moveTo(...ray[0]);
            ctx.lineTo(...ray[1]);
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(...lightPosition);
        ctx.rotate(angle);
        ctx.fillStyle = '#666';
        ctx.fillRect(-16, -6, 24, 12);

        ctx.beginPath();
        ctx.arc(8, 0, 10, -Tau / 4, Tau / 4, true);
        ctx.fill();

        ctx.restore();


        const dt = ts - timestamp;

        if (keys['KeyD']) lightPosition[0] += dt / 5;
        if (keys['KeyA']) lightPosition[0] -= dt / 5;

        if (keys['KeyS']) lightPosition[1] += dt / 5;
        if (keys['KeyW']) lightPosition[1] -= dt / 5;

        timestamp = ts;

        requestAnimationFrame(loop);
    };

    loop(+new Date);
}

function drawCone(ctx, x, y, r, aperture, angle, minBrightness) {
    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(angle);

    const gradient = ctx.createRadialGradient(0, 0, r / 20, 0, 0, r);
    gradient.addColorStop(0, "#EEE");
    gradient.addColorStop(1, minBrightness);

    ctx.fillStyle = gradient;

    ctx.filter = 'blur(4px)';

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -aperture / 2, aperture / 2);
    ctx.fill();

    ctx.restore();
}
