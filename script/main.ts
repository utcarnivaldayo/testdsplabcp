'use strict'

import Highcharts from 'https://code.highcharts.com/es-modules/masters/highcharts.src.js';
import 'https://code.highcharts.com/es-modules/masters/modules/exporting.src.js';
import * as DSP from "./fir.js"

const WASMPASS = "./ave.wasm";
const SAMPLE: number = 250;
const CHARTS: number = 4;
const TiTLE: string[] = ['Magnitude', 'Magnitude[dB]', 'Phase', 'Group delay'];
const DIVID: string[] = ['magchart', 'magdbchart', 'phasechart', 'gdchart'];
const INPUTFILEDID: string = 'order';
const DESIGNBUTTONID: string = 'design-button';
const FILTERTYPEID: string = 'filter-type';
const RESULTCOEFFICIENTS: string = 'result-coefficients';
const COEFFICIENTSTITLE: string = 'coefficients-title';
let datas: number[][][];
let wasm: WebAssembly.Instance;
let charts: Highcharts.Chart[];
let normalizedFrequency: number[]

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
    let order: number = Number((<HTMLInputElement>document.getElementById(INPUTFILEDID)).value);
    const orderMin: number = Number((<HTMLInputElement>document.getElementById(INPUTFILEDID)).min);
    const orderMax: number = Number((<HTMLInputElement>document.getElementById(INPUTFILEDID)).max);
    if (order < orderMin) {
        order = orderMin;
    }
    else if (order > orderMax) {
        order = orderMax;
    }
    const filterType: number = Number((<HTMLInputElement>document.getElementById(FILTERTYPEID)).value);
    
    wasm.exports.CreateCoefficients(order);
    wasm.exports.AveragingFilter(filterType);
    wasm.exports.CalculateResponse();
}

const updateCharts = () => {
    const bufferYDatas: number[][] = new Array(CHARTS);
    bufferYDatas[0] = new Array(SAMPLE);
    bufferYDatas[1] = new Array(SAMPLE);
    bufferYDatas[2] = new Array(SAMPLE);
    bufferYDatas[3] = new Array(SAMPLE);

    for (let i: number = 0; i < SAMPLE; i++) {
        bufferYDatas[0][i] = wasm.exports.ExportMagnitude(i);
        charts[0].series[0].data[i].update({ y: bufferYDatas[0][i]});
    }

    for (let i: number = 0; i < SAMPLE; i++) {
        bufferYDatas[1][i] = wasm.exports.ExportPower(i);
        charts[1].series[0].data[i].update({ y: bufferYDatas[1][i]});
    }

    for (let i: number = 0; i < SAMPLE; i++) {
        bufferYDatas[2][i] = wasm.exports.ExportPhase(i);
        charts[2].series[0].data[i].update({ y: bufferYDatas[2][i]});
    }

    for (let i: number = 0; i < SAMPLE; i++) {
        bufferYDatas[3][i] = wasm.exports.ExportGroupDelay(i);
        charts[3].series[0].data[i].update({ y: bufferYDatas[3][i]});
    }
}

const updateCoeffcients = () => {
    const resultElement: HTMLElement | null = document.getElementById(RESULTCOEFFICIENTS);
    const coeffcientsTitleElement: HTMLElement | null = document.getElementById(COEFFICIENTSTITLE);
    
    if (coeffcientsTitleElement !== null) {
        (<HTMLHeadingElement>coeffcientsTitleElement).innerHTML = "&raquo; フィルタ係数(h_0~h_" + wasm.exports.Order() + ")";
    }
    let coefficients: number[] = new Array(wasm.exports.Order() + 1);
    for (let i: number = 0; i < coefficients.length; i++) {
        coefficients[i] = wasm.exports.ExportCoefficient(i);
    }
    
    if (resultElement !== null) {
        (<HTMLTextAreaElement>resultElement).rows = coefficients.length;
        resultElement.innerText = "";
        for (let i: number = 0; i < coefficients.length; i++) {
            resultElement.insertAdjacentHTML('beforeend', coefficients[i] + '\n');
        }
    }
}

const buttonEvent = () => {
    designRun();
    updateCharts();
    updateCoeffcients();
}
    
window.onload = () => {
    charts = new Array(CHARTS);
    datas = new Array(CHARTS);
    normalizedFrequency = DSP.FIR.CreateNormalizedFrequency(SAMPLE) ?? [];
    
    //datas init
    for (let i: number = 0; i < CHARTS; i++) {
        datas[i] = new Array(normalizedFrequency.length);
        for (let j: number = 0; j < normalizedFrequency.length; j++) {
            datas[i][j] = new Array(2).fill(0.0);
            datas[i][j][0] = normalizedFrequency[j];
        }
    }

    for (let i: number = 0; i < CHARTS; i++) {
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

    let button: HTMLElement | null = document.getElementById(DESIGNBUTTONID);
    if (button !== null) {
        button.onclick = buttonEvent;   
    }
}

