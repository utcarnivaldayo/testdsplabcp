'use strict';
import Highcharts from 'https://code.highcharts.com/es-modules/masters/highcharts.src.js';
import 'https://code.highcharts.com/es-modules/masters/modules/exporting.src.js';
import * as DSP from "./fir.js";
const WASMPASS = "https://utcarnivaldayo.github.io/testdsplabcp/script/ave.wasm";
const SAMPLE = 250;
const CHARTS = 4;
const TiTLE = ['Magnitude', 'Magnitude[dB]', 'Phase', 'Group delay'];
const DIVID = ['magchart', 'magdbchart', 'phasechart', 'gdchart'];
const INPUTFILEDID = 'order';
const DESIGNBUTTONID = 'design-button';
const FILTERTYPEID = 'filter-type';
const RESULTCOEFFICIENTS = 'result-coefficients';
const COEFFICIENTSTITLE = 'coefficients-title';
let datas;
let wasm;
let charts;
let normalizedFrequency;
function WasmInit(url) {
    const go = new Go();
    if ('instantiateStreaming' in WebAssembly) {
        WebAssembly.instantiateStreaming(fetch(url), go.importObject).then(function (obj) {
            wasm = obj.instance;
            wasm.exports.Initialize(SAMPLE);
            go.run(wasm);
        });
    }
    else {
        fetch(url).then(resp => resp.arrayBuffer()).then(bytes => WebAssembly.instantiate(bytes, go.importObject).then(function (obj) {
            wasm = obj.instance;
            wasm.exports.Initialize(SAMPLE);
            go.run(wasm);
        }));
    }
}
const designRun = () => {
    let order = Number(document.getElementById(INPUTFILEDID).value);
    const orderMin = Number(document.getElementById(INPUTFILEDID).min);
    const orderMax = Number(document.getElementById(INPUTFILEDID).max);
    if (order < orderMin) {
        order = orderMin;
    }
    else if (order > orderMax) {
        order = orderMax;
    }
    const filterType = Number(document.getElementById(FILTERTYPEID).value);
    wasm.exports.CreateCoefficients(order);
    wasm.exports.AveragingFilter(filterType);
    wasm.exports.CalculateResponse();
};
const updateCharts = () => {
    for (let i = 0; i < SAMPLE; i++) {
        charts[0].series[0].data[i].update({ y: wasm.exports.ExportMagnitude(i) });
    }
    for (let i = 0; i < SAMPLE; i++) {
        charts[1].series[0].data[i].update({ y: wasm.exports.ExportPower(i) });
    }
    for (let i = 0; i < SAMPLE; i++) {
        charts[2].series[0].data[i].update({ y: wasm.exports.ExportPhase(i) });
    }
    for (let i = 0; i < SAMPLE; i++) {
        charts[3].series[0].data[i].update({ y: wasm.exports.ExportGroupDelay(i) });
    }
};
const updateCoeffcients = () => {
    const resultElement = document.getElementById(RESULTCOEFFICIENTS);
    const coeffcientsTitleElement = document.getElementById(COEFFICIENTSTITLE);
    if (coeffcientsTitleElement !== null) {
        coeffcientsTitleElement.innerHTML = "&raquo; フィルタ係数(h_0~h_" + wasm.exports.Order() + ")";
    }
    let coefficients = new Array(wasm.exports.Order() + 1);
    for (let i = 0; i < coefficients.length; i++) {
        coefficients[i] = wasm.exports.ExportCoefficient(i);
    }
    if (resultElement !== null) {
        resultElement.rows = coefficients.length;
        resultElement.innerText = "";
        for (let i = 0; i < coefficients.length; i++) {
            resultElement.insertAdjacentHTML('beforeend', coefficients[i] + '\n');
        }
    }
};
const buttonEvent = () => {
    designRun();
    updateCharts();
    updateCoeffcients();
};
window.onload = () => {
    var _a;
    charts = new Array(CHARTS);
    datas = new Array(CHARTS);
    normalizedFrequency = (_a = DSP.FIR.CreateNormalizedFrequency(SAMPLE)) !== null && _a !== void 0 ? _a : [];
    //datas init
    for (let i = 0; i < CHARTS; i++) {
        datas[i] = new Array(normalizedFrequency.length);
        for (let j = 0; j < normalizedFrequency.length; j++) {
            datas[i][j] = new Array(2).fill(0.0);
            datas[i][j][0] = normalizedFrequency[j];
        }
    }
    for (let i = 0; i < CHARTS; i++) {
        charts[i] = Highcharts.chart(DIVID[i], {
            chart: {
                type: 'line'
            },
            title: {
                text: TiTLE[i]
            },
            xAxis: {
                title: {
                    text: 'Normalized frequency'
                }
            },
            yAxis: {
                title: {
                    text: TiTLE[i]
                }
            },
            series: [
                {
                    name: TiTLE[i],
                    data: datas[i]
                }
            ],
            plotOptions: {
                series: {
                    marker: {
                        enabled: false
                    }
                }
            }
        });
    }
    WasmInit(WASMPASS);
    let button = document.getElementById(DESIGNBUTTONID);
    if (button !== null) {
        button.onclick = buttonEvent;
    }
};
