(function() {
    // Acquire the VS Code API for communication between the webview and the extension
    const vscode = acquireVsCodeApi();

    // Function to get the line number from the clicked element
    function getLineNumber(element) {
        return element.dataset.lineNumber;
    }

    // Function to handle click events in both sections
    function handleClickEvent(event) {
        // Get the line number from the clicked element
        let lineNumber = getLineNumber(event.currentTarget);

        // Post a message to the VS Code extension with the line number and the section ID
        vscode.postMessage({
            command: 'logLineNumber',
            lineNumber: lineNumber,
            section: event.currentTarget.parentElement.id
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        // Attach event listeners to both sections
        const declLines = document.querySelectorAll('#declaration > .line');

        // Add click event listeners to each line element
        declLines.forEach(declLine => {
            declLine.addEventListener('click', handleClickEvent);
        });

        const implLines = document.querySelectorAll('#implementation > .line');

        // Add click event listeners to each line element
        implLines.forEach(implLine => {
            implLine.addEventListener('click', handleClickEvent);
        });

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'highlightLine':
                    setHighlights(message.section, message.lineNumbers);
                    break;
            }
        });
    });

    function logToExtension(message) {
        vscode.postMessage({
            command: 'logFromScript',
            message: message
        });
    }
    // Function to toggle the highlight class on the clicked element
    function setHighlights(sectionId, elements) {
        const allLines = document.querySelectorAll(`#${sectionId} > .line`);
        
        logToExtension(elements);
        allLines.forEach(line => {
            const lineNumber = parseInt(line.dataset.lineNumber);
            if (elements.includes(lineNumber)) {
                line.classList.add('highlight');
            } else {
                line.classList.remove('highlight');
            }
        });
    }
}
)();