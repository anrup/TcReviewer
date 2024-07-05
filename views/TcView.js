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

    // handle modal dynamic content

    function dragElement(elm) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        elm.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elm.style.top = (elm.offsetTop - pos2) + "px";
            elm.style.left = (elm.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        dragElement(document.getElementById('modal'));

        document.getElementById('open-comment-editor').addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('modal').style.display = 'block';
            document.getElementById('comment-textarea').value = ''; // Set initial textarea value
        });

        document.getElementById('save-comment').addEventListener('click', function() {
            let comment = document.getElementById('comment-textarea').value;
            let truncatedComment = comment.split(' ').slice(0, 120).join(' ');
            document.getElementById('comment-summary').textContent = truncatedComment + (comment.length > truncatedComment.length ? '...' : '');
            document.getElementById('modal').style.display = 'none';
        });

        document.getElementById('cancel-comment').addEventListener('click', function() {
            document.getElementById('modal').style.display = 'none';
        });

        // Initial update of comment summary
        let initialComment = ''; // Replace with initial comment value if needed
        let initialTruncatedComment = initialComment.split(' ').slice(0, 120).join(' ');
        document.getElementById('comment-summary').textContent = initialTruncatedComment + (initialComment.length > initialTruncatedComment.length ? '...' : '');
    });
}
)();