'use strict'

import Highcharts from 'https://code.highcharts.com/es-modules/masters/highcharts.src.js';
import 'https://code.highcharts.com/es-modules/masters/modules/exporting.src.js';
import * as DSP from "./fir.js"

const WASMPASS = "../../script/zp.wasm";
const SAMPLE: number = 250;
const CHARTS: number = 6;
const DEFAULTCHARTS: number = 4;
const FILTERORDER: number = 4;
const TITLE : string[] = ['Magnitude', 'Magnitude[dB]', 'Phase', 'Group delay', 'Coefficients', 'Zeros and Poles'];
const YTITLE: string[] = ['Magnitude', 'Magnitude[dB]', 'Phase', 'Group delay', 'a_2, b_2', 'Im'];
const XTITLE: string[] = ['Normalized frequency', 'Normalized frequency', 'Normalized frequency', 'Normalized frequency', 'a_1, b_1', 'Re']
const DIVID: string[] = ['magchart', 'magdbchart', 'phasechart', 'gdchart', 'coefchart', 'zpchart'];
const INPUTFILEDSCALINGID: string = 'a-0';
const INPUTFILEDNUMERATORID: string[] = ['a-1-1', 'a-1-2', 'a-2-1', 'a-2-2'];
const INPUTFILEDDENOMINATORID: string[] = ['b-1-1', 'b-1-2', 'b-2-1', 'b-2-2'];
const DESIGNBUTTONID: string = 'design-button';
let datas: number[][][];
let wasm: WebAssembly.Instance;
let charts: Highcharts.Chart[];
let normalizedFrequency: number[];
let scaling: number = 0.0;
let numerator: number[];
let denominaor: number[];
let coefficients: number[][][];
let zeros: number[][][];

function WasmInit(url: string) {
    const go = new Go();
    if ('instantiateStreaming' in WebAssembly) {
    WebAssembly.instantiateStreaming(fetch(url), go.importObject).then(function (obj) {
        wasm = obj.instance;
        wasm.exports.Initialize(SAMPLE);
        go.run(wasm);
    })
    } else {
        fetch(url).then(resp =>
            resp.arrayBuffer()
        ).then(bytes =>
                WebAssembly.instantiate(bytes, go.importObject).then(function (obj) {
                    wasm = obj.instance;
                    wasm.exports.Initialize(SAMPLE);
                    go.run(wasm);
            })
        )
    }
}

const designRun = () => {

    let rangeMin: number = Number((<HTMLInputElement>document.getElementById(INPUTFILEDSCALINGID)).min);
    let rangeMax: number = Number((<HTMLInputElement>document.getElementById(INPUTFILEDSCALINGID)).max);
    scaling = Number((<HTMLInputElement>document.getElementById(INPUTFILEDSCALINGID)).value);
    if (scaling < rangeMin) {
        scaling = rangeMin;
    } else if (scaling > rangeMax) {
        scaling = rangeMax;
    }
    wasm.exports.SetScaling(scaling);

    wasm.exports.CreateCoefficients(FILTERORDER, FILTERORDER);
    for (let i: number = 0; i < FILTERORDER; i++) {
        
        //numerator
        numerator[i] = Number((<HTMLInputElement>document.getElementById(INPUTFILEDNUMERATORID[i])).value);
        rangeMin = Number((<HTMLInputElement>document.getElementById(INPUTFILEDNUMERATORID[i])).min);
        rangeMax = Number((<HTMLInputElement>document.getElementById(INPUTFILEDNUMERATORID[i])).max);
        if (numerator[i] < rangeMin) {
            numerator[i] = rangeMin;
        } else if (numerator[i] > rangeMax) {
            numerator[i] = rangeMax;
        }
        wasm.exports.SetNumeratorCoefficients(numerator[i], i);

        //denominator
        denominaor[i] = Number((<HTMLInputElement>document.getElementById(INPUTFILEDDENOMINATORID[i])).value);
        rangeMin = Number((<HTMLInputElement>document.getElementById(INPUTFILEDDENOMINATORID[i])).min);
        rangeMax = Number((<HTMLInputElement>document.getElementById(INPUTFILEDDENOMINATORID[i])).max);
        if (denominaor[i] < rangeMin) {
            denominaor[i] = rangeMin;
        } else if (denominaor[i] > rangeMax) {
            denominaor[i] = rangeMax;
        }
        wasm.exports.SetDenominatorCoefficients(denominaor[i], i);
    }
    
    wasm.exports.CalculateResponse();
    wasm.exports.CalculateZerosPoles();
}

const updateCharts = () => {

    for (let i: number = 0; i < SAMPLE; i++) {
        charts[0].series[0].data[i].update({ y: wasm.exports.ExportMagnitude(i) });
        charts[1].series[0].data[i].update({ y: wasm.exports.ExportPower(i) });
        charts[2].series[0].data[i].update({ y: wasm.exports.ExportPhase(i) });
        charts[3].series[0].data[i].update({ y: wasm.exports.ExportGroupDelay(i) });
    }
    let first = 0;
    let second = 0;
    
    //coefficients
    for (let i: number = 0; i < (FILTERORDER >> 1); i++) {
        first = i << 1;
        second = first + 1;
        charts[4].series[0].data[i].update({ x: wasm.exports.ExportNumeratorCoefficients(first), y: wasm.exports.ExportNumeratorCoefficients(second) });
        charts[4].series[1].data[i].update({ x: wasm.exports.ExportDenominatorCoefficients(first), y: wasm.exports.ExportDenominatorCoefficients(second) });
    }

    //zeros
    for (let i: number = 0; i < FILTERORDER; i++) {
        charts[5].series[0].data[i].update({ x: wasm.exports.ExportZero(i, true), y: wasm.exports.ExportZero(i, false) });
        charts[5].series[1].data[i].update({ x: wasm.exports.ExportPole(i, true), y: wasm.exports.ExportPole(i, false) })
    }
}

const buttonEvent = () => {
    designRun();
    updateCharts();
    //updateCoeffcients();
}
    
window.onload = () => {
    charts = new Array(CHARTS);
    datas = new Array(DEFAULTCHARTS);
    normalizedFrequency = DSP.FIR.CreateNormalizedFrequency(SAMPLE) ?? [];
    scaling = 0.0;
    numerator = new Array(FILTERORDER);
    denominaor = new Array(FILTERORDER);
    coefficients = new Array(2);
    zeros = new Array(2);
    
    //datas init
    for (let i: number = 0; i < DEFAULTCHARTS; i++) {
        datas[i] = new Array(normalizedFrequency.length);
        for (let j: number = 0; j < normalizedFrequency.length; j++) {
            datas[i][j] = new Array(2).fill(0.0);
            datas[i][j][0] = normalizedFrequency[j];
        }
    }

    //coeffcients and zeros
    for (let i: number = 0; i < 2; i++) {
        coefficients[i] = new Array(FILTERORDER >> 1);
        for (let j: number = 0; j < (FILTERORDER >> 1); j++) {
            coefficients[i][j] = new Array(2).fill(0.0);
        }

        zeros[i] = new Array(FILTERORDER);
        for (let j: number = 0; j < FILTERORDER; j++) {
            zeros[i][j] = new Array(2).fill(0.0);
        }
    }

    for (let i: number = 0; i < DEFAULTCHARTS; i++) {
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
            type: 'scatter'
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
                data: coefficients[0]
            },
            {
                name: 'Denominator',
                data: coefficients[1]
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

    let button: HTMLElement | null = document.getElementById(DESIGNBUTTONID);
    if (button !== null) {
        button.onclick = buttonEvent;   
    }
}

