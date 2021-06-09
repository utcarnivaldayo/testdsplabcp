export class FIR {
    constructor() {
        this.coeffcients = [];
        this.normalizedFrequency = [];
        this.responseRe = [];
        this.responseIm = [];
        this.groupDelay = [];
    }
    set Coefficients(coeffcients) {
        this.coeffcients = coeffcients;
    }
    get Coefficients() {
        return this.coeffcients;
    }
    get Order() {
        return this.coeffcients.length - 1;
    }
    get SampleNumber() {
        return this.normalizedFrequency.length;
    }
    Initialize(normalizedFrequency) {
        if (normalizedFrequency.length < 2) {
            return null;
        }
        this.normalizedFrequency = normalizedFrequency;
        this.responseRe = new Array(this.normalizedFrequency.length).fill(0.0);
        this.responseIm = new Array(this.normalizedFrequency.length).fill(0.0);
        this.groupDelay = new Array(this.normalizedFrequency.length).fill(0.0);
    }
    CalculateResponse() {
        var _a, _b;
        if (this.normalizedFrequency.length === 0) {
            return null;
        }
        if (this.coeffcients.length === 0) {
            return null;
        }
        for (let i = 0; i < this.normalizedFrequency.length; i++) {
            this.responseRe[i] = (_a = FIR.ConvolutionCos(this.coeffcients, this.normalizedFrequency[i])) !== null && _a !== void 0 ? _a : 0.0;
            this.responseIm[i] = (_b = FIR.ConvolutionSin(this.coeffcients, -this.normalizedFrequency[i])) !== null && _b !== void 0 ? _b : 0.0;
        }
    }
    CalculateGroupDelay() {
        var _a, _b;
        if (this.normalizedFrequency.length === 0) {
            return null;
        }
        if (this.coeffcients.length === 0) {
            return null;
        }
        //weighted coefficients
        let weightedCoefficients = new Array(this.coeffcients.length).fill(0.0);
        for (let i = 0; i < this.coeffcients.length; i++) {
            weightedCoefficients[i] = i * this.coeffcients[i];
        }
        for (let i = 0; i < this.normalizedFrequency.length; i++) {
            const responseRePrime = (_a = FIR.ConvolutionSin(weightedCoefficients, -this.normalizedFrequency[i])) !== null && _a !== void 0 ? _a : 0.0;
            const responseImPrime = (_b = FIR.ConvolutionCos(weightedCoefficients, this.normalizedFrequency[i])) !== null && _b !== void 0 ? _b : 0.0;
            const power = this.responseRe[i] * this.responseRe[i] + this.responseIm[i] * this.responseIm[i];
            this.groupDelay[i] = (responseImPrime * this.responseRe[i] + this.responseIm[i] * responseRePrime) / power;
        }
    }
    static ConvolutionCos(coeffcients, normalizedFrequency) {
        let ans = 0.0;
        const omega = 2.0 * Math.PI * normalizedFrequency;
        for (let i = 0; i < coeffcients.length; i++) {
            ans += coeffcients[i] * Math.cos(i * omega);
        }
        return ans;
    }
    static ConvolutionSin(coeffcients, normalizedFrequency) {
        let ans = 0.0;
        const omega = 2.0 * Math.PI * normalizedFrequency;
        for (let i = 0; i < coeffcients.length; i++) {
            ans += coeffcients[i] * Math.sin(i * omega);
        }
        return ans;
    }
    Magnitude() {
        if (this.normalizedFrequency.length === 0) {
            return null;
        }
        let magnitude = new Array(this.normalizedFrequency.length).fill(0.0);
        for (let i = 0; i < this.normalizedFrequency.length; i++) {
            const power = this.responseRe[i] * this.responseRe[i] + this.responseIm[i] * this.responseIm[i];
            magnitude[i] = Math.sqrt(power);
        }
        return magnitude;
    }
    Power() {
        if (this.normalizedFrequency.length === 0) {
            return null;
        }
        let magnitude = new Array(this.normalizedFrequency.length).fill(0.0);
        for (let i = 0; i < this.normalizedFrequency.length; i++) {
            const power = this.responseRe[i] * this.responseRe[i] + this.responseIm[i] * this.responseIm[i];
            magnitude[i] = 10.0 * Math.log10(power);
        }
        return magnitude;
    }
    Phase() {
        if (this.normalizedFrequency.length === 0) {
            return null;
        }
        let phase = new Array(this.normalizedFrequency.length).fill(0.0);
        for (let i = 0; i < this.normalizedFrequency.length; i++) {
            phase[i] = Math.atan2(this.responseIm[i], this.responseRe[i]);
        }
        return phase;
    }
    GroupDelay() {
        if (this.normalizedFrequency.length === 0) {
            return null;
        }
        return this.groupDelay.slice();
    }
    static CreateNormalizedFrequency(sample) {
        if (sample < 2) {
            return null;
        }
        let normalizedFrequency = new Array(sample);
        const delta = 0.5 / (sample - 1);
        for (let i = 0; i < sample; i++) {
            normalizedFrequency[i] = i * delta;
        }
        return normalizedFrequency;
    }
    static MeanAverageFilter(order) {
        if (order <= 0) {
            return null;
        }
        const coeffcients = new Array(order + 1).fill(1.0 / (order + 1));
        return coeffcients;
    }
}
