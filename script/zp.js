'use strict';
import Highcharts from 'https://code.highcharts.com/es-modules/masters/highcharts.src.js';
import 'https://code.highcharts.com/es-modules/masters/modules/exporting.src.js';
import * as DSP from "./fir.js";
const WASMPASS = "../../script/zp.wasm";
const SAMPLE = 250;
const CHARTS = 6;
const DEFAULTCHARTS = 4;
const FILTERORDER = 4;
const TITLE = ['Magnitude', 'Magnitude[dB]', 'Phase', 'Group delay', 'Coefficients', 'Zeros and Poles'];
const YTITLE = ['Magnitude', 'Magnitude[dB]', 'Phase', 'Group delay', 'a_2, b_2', 'Im'];
const XTITLE = ['Normalized frequency', 'Normalized frequency', 'Normalized frequency', 'Normalized frequency', 'a_1, b_1', 'Re'];
const DIVID = ['magchart', 'magdbchart', 'phasechart', 'gdchart', 'coefchart', 'zpchart'];
const INPUTFILEDSCALINGID = 'a-0';
const INPUTFILEDNUMERATORID = ['a-1-1', 'a-1-2', 'a-2-1', 'a-2-2'];
const INPUTFILEDDENOMINATORID = ['b-1-1', 'b-1-2', 'b-2-1', 'b-2-2'];
const DESIGNBUTTONID = 'design-button';
let datas;
let wasm;
let charts;
let normalizedFrequency;
let scaling = 0.0;
let numerator;
let denominaor;
let coefficients;
let zeros;
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
    let rangeMin = Number(document.getElementById(INPUTFILEDSCALINGID).min);
    let rangeMax = Number(document.getElementById(INPUTFILEDSCALINGID).max);
    scaling = Number(document.getElementById(INPUTFILEDSCALINGID).value);
    if (scaling < rangeMin) {
        scaling = rangeMin;
    }
    else if (scaling > rangeMax) {
        scaling = rangeMax;
    }
    wasm.exports.SetScaling(scaling);
    wasm.exports.CreateCoefficients(FILTERORDER, FILTERORDER);
    for (let i = 0; i < FILTERORDER; i++) {
        //numerator
        numerator[i] = Number(document.getElementById(INPUTFILEDNUMERATORID[i]).value);
        rangeMin = Number(document.getElementById(INPUTFILEDNUMERATORID[i]).min);
        rangeMax = Number(document.getElementById(INPUTFILEDNUMERATORID[i]).max);
        if (numerator[i] < rangeMin) {
            numerator[i] = rangeMin;
        }
        else if (numerator[i] > rangeMax) {
            numerator[i] = rangeMax;
        }
        wasm.exports.SetNumeratorCoefficients(numerator[i], i);
        //denominator
        denominaor[i] = Number(document.getElementById(INPUTFILEDDENOMINATORID[i]).value);
        rangeMin = Number(document.getElementById(INPUTFILEDDENOMINATORID[i]).min);
        rangeMax = Number(document.getElementById(INPUTFILEDDENOMINATORID[i]).max);
        if (denominaor[i] < rangeMin) {
            denominaor[i] = rangeMin;
        }
        else if (denominaor[i] > rangeMax) {
            denominaor[i] = rangeMax;
        }
        wasm.exports.SetDenominatorCoefficients(denominaor[i], i);
    }
    wasm.exports.CalculateResponse();
    wasm.exports.CalculateZerosPoles();
};
const updateCharts = () => {
    for (let i = 0; i < SAMPLE; i++) {
        charts[0].series[0].data[i].update({ y: wasm.exports.ExportMagnitude(i) });
        charts[1].series[0].data[i].update({ y: wasm.exports.ExportPower(i) });
        charts[2].series[0].data[i].update({ y: wasm.exports.ExportPhase(i) });
        charts[3].series[0].data[i].update({ y: wasm.exports.ExportGroupDelay(i) });
    }
    let first = 0;
    let second = 0;
    //coefficients
    for (let i = 0; i < (FILTERORDER >> 1); i++) {
        first = i << 1;
        second = first + 1;
        charts[4].series[0].data[i].update({ x: wasm.exports.ExportNumeratorCoefficients(first), y: wasm.exports.ExportNumeratorCoefficients(second) });
        charts[4].series[1].data[i].update({ x: wasm.exports.ExportDenominatorCoefficients(first), y: wasm.exports.ExportDenominatorCoefficients(second) });
    }
    //zeros
    for (let i = 0; i < FILTERORDER; i++) {
        charts[5].series[0].data[i].update({ x: wasm.exports.ExportZero(i, true), y: wasm.exports.ExportZero(i, false) });
        charts[5].series[1].data[i].update({ x: wasm.exports.ExportPole(i, true), y: wasm.exports.ExportPole(i, false) });
    }
};
const buttonEvent = () => {
    designRun();
    updateCharts();
    //updateCoeffcients();
};
window.onload = () => {
    var _a;
    charts = new Array(CHARTS);
    datas = new Array(DEFAULTCHARTS);
    normalizedFrequency = (_a = DSP.FIR.CreateNormalizedFrequency(SAMPLE)) !== null && _a !== void 0 ? _a : [];
    scaling = 0.0;
    numerator = new Array(FILTERORDER);
    denominaor = new Array(FILTERORDER);
    coefficients = new Array(2);
    zeros = new Array(2);
    //datas init
    for (let i = 0; i < DEFAULTCHARTS; i++) {
        datas[i] = new Array(normalizedFrequency.length);
        for (let j = 0; j < normalizedFrequency.length; j++) {
            datas[i][j] = new Array(2).fill(0.0);
            datas[i][j][0] = normalizedFrequency[j];
        }
    }
    //coeffcients and zeros
    for (let i = 0; i < 2; i++) {
        coefficients[i] = new Array(FILTERORDER >> 1);
        for (let j = 0; j < (FILTERORDER >> 1); j++) {
            coefficients[i][j] = new Array(2).fill(0.0);
        }
        zeros[i] = new Array(FILTERORDER);
        for (let j = 0; j < FILTERORDER; j++) {
            zeros[i][j] = new Array(2).fill(0.0);
        }
    }
    for (let i = 0; i < DEFAULTCHARTS; i++) {
        charts[i] = Highcharts.chart(DIVID[i], {
            chart: {
                type: 'line'
            },
            title: {
                text: TITLE[i]
            },
            xAxis: {
                title: {
                    text: XTITLE[i]
                }
            },
            yAxis: {
                title: {
                    text: YTITLE[i]
                }
            },
            series: [
                {
                    name: TITLE[i],
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
    //coef
    charts[4] = Highcharts.chart(DIVID[4], {
        chart: {
            type: 'polygon'
        },
        title: {
            text: TITLE[4]
        },
        xAxis: {
            title: {
                text: XTITLE[4]
            }
        },
        yAxis: {
            title: {
                text: YTITLE[4]
            }
        },
        series: [
            {
                name: 'Numerator',
                type: 'scatter',
                data: coefficients[0]
            },
            {
                name: 'Denominator',
                type: 'scatter',
                data: coefficients[1]
            },
            {
                name: 'Stability triangle',
                data: [[-2.0, 1.0], [0.0, -1.0], [2.0, 1.0]]
            }
        ],
        plotOptions: {
            series: {
                marker: {
                    enabled: true
                }
            }
        }
    });
    charts[5] = Highcharts.chart(DIVID[5], {
        chart: {
            type: 'scatter'
        },
        title: {
            text: TITLE[5]
        },
        xAxis: {
            title: {
                text: XTITLE[5]
            }
        },
        yAxis: {
            title: {
                text: YTITLE[5]
            }
        },
        series: [
            {
                name: 'Zero',
                data: zeros[0]
            },
            {
                name: 'Pole',
                data: zeros[1]
            }
        ],
        plotOptions: {
            series: {
                marker: {
                    enabled: true
                }
            }
        }
    });
    WasmInit(WASMPASS);
    let button = document.getElementById(DESIGNBUTTONID);
    if (button !== null) {
        button.onclick = buttonEvent;
    }
};
