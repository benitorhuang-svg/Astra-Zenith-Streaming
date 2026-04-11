export class AZBrackets extends HTMLElement {
    connectedCallback(): void {
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
customElements.define('az-brackets', AZBrackets);
