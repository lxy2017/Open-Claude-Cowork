export type CaretCoordinates = {
    top: number;
    left: number;
    height: number;
};

const propertiesToCopy = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
] as const;

// Cached mirror div for better performance
let cachedMirrorDiv: HTMLDivElement | null = null;
let cachedSpan: HTMLSpanElement | null = null;
let lastElementRef: HTMLTextAreaElement | null = null;

function getMirrorDiv(): { div: HTMLDivElement; span: HTMLSpanElement } {
    if (!cachedMirrorDiv) {
        cachedMirrorDiv = document.createElement('div');
        cachedMirrorDiv.id = 'input-textarea-caret-position-mirror-div';
        cachedMirrorDiv.style.position = 'absolute';
        cachedMirrorDiv.style.visibility = 'hidden';
        cachedMirrorDiv.style.pointerEvents = 'none';
        cachedMirrorDiv.style.top = '-9999px';
        cachedMirrorDiv.style.left = '-9999px';
        document.body.appendChild(cachedMirrorDiv);
    }

    if (!cachedSpan) {
        cachedSpan = document.createElement('span');
    }

    return { div: cachedMirrorDiv, span: cachedSpan };
}

export function getCaretCoordinates(
    element: HTMLTextAreaElement,
    position: number
): CaretCoordinates {
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser) {
        return { top: 0, left: 0, height: 0 };
    }

    const { div, span } = getMirrorDiv();
    const computed = window.getComputedStyle(element);

    // Only update styles if element changed
    if (lastElementRef !== element) {
        lastElementRef = element;

        const style = div.style;
        style.whiteSpace = 'pre-wrap';
        if (element.nodeName !== 'INPUT') {
            style.wordWrap = 'break-word';
        }

        propertiesToCopy.forEach(prop => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style[prop as any] = computed[prop as any];
        });

        if (isMozilla()) {
            if (element.scrollHeight > parseInt(computed.height)) {
                style.overflowY = 'scroll';
            }
        } else {
            style.overflow = 'hidden';
        }
    }

    // Update width to match current element width (in case of resize)
    div.style.width = computed.width;

    // Update content
    div.textContent = element.value.substring(0, position);
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    const fontSize = parseInt(computed['fontSize']);

    // Get the actual rendered height of the span for precise alignment
    const spanHeight = span.offsetHeight;

    // Calculate caret height to match font size
    const caretHeight = fontSize;

    // Calculate vertical offset to center the caret within the line
    // Use span's actual position and center the caret height within it
    const verticalOffset = (spanHeight - caretHeight) / 2;

    const coordinates = {
        top: span.offsetTop + parseInt(computed['borderTopWidth']) + verticalOffset,
        left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
        height: caretHeight
    };

    return coordinates;
}

// Cleanup function (optional - call when component unmounts)
export function cleanupCaretMirror(): void {
    if (cachedMirrorDiv && cachedMirrorDiv.parentNode) {
        cachedMirrorDiv.parentNode.removeChild(cachedMirrorDiv);
    }
    cachedMirrorDiv = null;
    cachedSpan = null;
    lastElementRef = null;
}

function isMozilla() {
    return typeof window !== 'undefined' && 'mozInnerScreenX' in window;
}
