"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AZBrackets = void 0;
class AZBrackets extends HTMLElement {
    connectedCallback() {
        this.style.display = 'block';
        this.style.pointerEvents = 'none';
        this.innerHTML = `
            <div class="a-bracket a-bracket--tl"></div>
            <div class="a-bracket a-bracket--tr"></div>
            <div class="a-bracket a-bracket--bl"></div>
            <div class="a-bracket a-bracket--br"></div>
        `;
    }
}
exports.AZBrackets = AZBrackets;
customElements.define('az-brackets', AZBrackets);
