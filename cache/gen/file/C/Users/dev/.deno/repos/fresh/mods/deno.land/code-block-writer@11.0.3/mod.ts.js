import { escapeForWithinString, getStringFromStrOrFunc } from "./utils/string_utils.ts";
var /** @internal */ CommentChar;
(function(CommentChar) {
    CommentChar[CommentChar["Line"] = 0] = "Line";
    CommentChar[CommentChar["Star"] = 1] = "Star";
})(CommentChar || (CommentChar = {}));
// Using the char codes is a performance improvement (about 5.5% faster when writing because it eliminates additional string allocations).
const CHARS = {
    BACK_SLASH: "\\".charCodeAt(0),
    FORWARD_SLASH: "/".charCodeAt(0),
    NEW_LINE: "\n".charCodeAt(0),
    CARRIAGE_RETURN: "\r".charCodeAt(0),
    ASTERISK: "*".charCodeAt(0),
    DOUBLE_QUOTE: "\"".charCodeAt(0),
    SINGLE_QUOTE: "'".charCodeAt(0),
    BACK_TICK: "`".charCodeAt(0),
    OPEN_BRACE: "{".charCodeAt(0),
    CLOSE_BRACE: "}".charCodeAt(0),
    DOLLAR_SIGN: "$".charCodeAt(0),
    SPACE: " ".charCodeAt(0),
    TAB: "\t".charCodeAt(0)
};
const isCharToHandle = new Set([
    CHARS.BACK_SLASH,
    CHARS.FORWARD_SLASH,
    CHARS.NEW_LINE,
    CHARS.CARRIAGE_RETURN,
    CHARS.ASTERISK,
    CHARS.DOUBLE_QUOTE,
    CHARS.SINGLE_QUOTE,
    CHARS.BACK_TICK,
    CHARS.OPEN_BRACE,
    CHARS.CLOSE_BRACE
]);
/**
 * Code writer that assists with formatting and visualizing blocks of JavaScript or TypeScript code.
 */ export default class CodeBlockWriter {
    /** @internal */ _indentationText;
    /** @internal */ _newLine;
    /** @internal */ _useTabs;
    /** @internal */ _quoteChar;
    /** @internal */ _indentNumberOfSpaces;
    /** @internal */ _currentIndentation = 0;
    /** @internal */ _queuedIndentation;
    /** @internal */ _queuedOnlyIfNotBlock;
    /** @internal */ _length = 0;
    /** @internal */ _newLineOnNextWrite = false;
    /** @internal */ _currentCommentChar = undefined;
    /** @internal */ _stringCharStack = [];
    /** @internal */ _isInRegEx = false;
    /** @internal */ _isOnFirstLineOfBlock = true;
    // An array of strings is used rather than a single string because it was
    // found to be ~11x faster when printing a 10K line file (~11s to ~1s).
    /** @internal */ _texts = [];
    /**
   * Constructor.
   * @param opts - Options for the writer.
   */ constructor(opts = {}){
        this._newLine = opts.newLine || "\n";
        this._useTabs = opts.useTabs || false;
        this._indentNumberOfSpaces = opts.indentNumberOfSpaces || 4;
        this._indentationText = getIndentationText(this._useTabs, this._indentNumberOfSpaces);
        this._quoteChar = opts.useSingleQuote ? "'" : `"`;
    }
    /**
   * Gets the options.
   */ getOptions() {
        return {
            indentNumberOfSpaces: this._indentNumberOfSpaces,
            newLine: this._newLine,
            useTabs: this._useTabs,
            useSingleQuote: this._quoteChar === "'"
        };
    }
    queueIndentationLevel(countOrText) {
        this._queuedIndentation = this._getIndentationLevelFromArg(countOrText);
        this._queuedOnlyIfNotBlock = undefined;
        return this;
    }
    /**
   * Writes the text within the provided action with hanging indentation.
   * @param action - Action to perform with hanging indentation.
   */ hangingIndent(action) {
        return this._withResetIndentation(()=>this.queueIndentationLevel(this.getIndentationLevel() + 1), action);
    }
    /**
   * Writes the text within the provided action with hanging indentation unless writing a block.
   * @param action - Action to perform with hanging indentation unless a block is written.
   */ hangingIndentUnlessBlock(action) {
        return this._withResetIndentation(()=>{
            this.queueIndentationLevel(this.getIndentationLevel() + 1);
            this._queuedOnlyIfNotBlock = true;
        }, action);
    }
    setIndentationLevel(countOrText) {
        this._currentIndentation = this._getIndentationLevelFromArg(countOrText);
        return this;
    }
    withIndentationLevel(countOrText, action) {
        return this._withResetIndentation(()=>this.setIndentationLevel(countOrText), action);
    }
    /** @internal */ _withResetIndentation(setStateAction, writeAction) {
        const previousState = this._getIndentationState();
        setStateAction();
        try {
            writeAction();
        } finally{
            this._setIndentationState(previousState);
        }
        return this;
    }
    /**
   * Gets the current indentation level.
   */ getIndentationLevel() {
        return this._currentIndentation;
    }
    /**
   * Writes a block using braces.
   * @param block - Write using the writer within this block.
   */ block(block) {
        this._newLineIfNewLineOnNextWrite();
        if (this.getLength() > 0 && !this.isLastNewLine()) {
            this.spaceIfLastNot();
        }
        this.inlineBlock(block);
        this._newLineOnNextWrite = true;
        return this;
    }
    /**
   * Writes an inline block with braces.
   * @param block - Write using the writer within this block.
   */ inlineBlock(block) {
        this._newLineIfNewLineOnNextWrite();
        this.write("{");
        this._indentBlockInternal(block);
        this.newLineIfLastNot().write("}");
        return this;
    }
    indent(timesOrBlock = 1) {
        if (typeof timesOrBlock === "number") {
            this._newLineIfNewLineOnNextWrite();
            return this.write(this._indentationText.repeat(timesOrBlock));
        } else {
            this._indentBlockInternal(timesOrBlock);
            if (!this.isLastNewLine()) {
                this._newLineOnNextWrite = true;
            }
            return this;
        }
    }
    /** @internal */ _indentBlockInternal(block) {
        if (this.getLastChar() != null) {
            this.newLineIfLastNot();
        }
        this._currentIndentation++;
        this._isOnFirstLineOfBlock = true;
        if (block != null) {
            block();
        }
        this._isOnFirstLineOfBlock = false;
        this._currentIndentation = Math.max(0, this._currentIndentation - 1);
    }
    conditionalWriteLine(condition, strOrFunc) {
        if (condition) {
            this.writeLine(getStringFromStrOrFunc(strOrFunc));
        }
        return this;
    }
    /**
   * Writes a line of text.
   * @param text - String to write.
   */ writeLine(text) {
        this._newLineIfNewLineOnNextWrite();
        if (this.getLastChar() != null) {
            this.newLineIfLastNot();
        }
        this._writeIndentingNewLines(text);
        this.newLine();
        return this;
    }
    /**
   * Writes a newline if the last line was not a newline.
   */ newLineIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastNewLine()) {
            this.newLine();
        }
        return this;
    }
    /**
   * Writes a blank line if the last written text was not a blank line.
   */ blankLineIfLastNot() {
        if (!this.isLastBlankLine()) {
            this.blankLine();
        }
        return this;
    }
    /**
   * Writes a blank line if the condition is true.
   * @param condition - Condition to evaluate.
   */ conditionalBlankLine(condition) {
        if (condition) {
            this.blankLine();
        }
        return this;
    }
    /**
   * Writes a blank line.
   */ blankLine() {
        return this.newLineIfLastNot().newLine();
    }
    /**
   * Writes a newline if the condition is true.
   * @param condition - Condition to evaluate.
   */ conditionalNewLine(condition) {
        if (condition) {
            this.newLine();
        }
        return this;
    }
    /**
   * Writes a newline.
   */ newLine() {
        this._newLineOnNextWrite = false;
        this._baseWriteNewline();
        return this;
    }
    quote(text) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(text == null ? this._quoteChar : this._quoteChar + escapeForWithinString(text, this._quoteChar) + this._quoteChar);
        return this;
    }
    /**
   * Writes a space if the last character was not a space.
   */ spaceIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastSpace()) {
            this._writeIndentingNewLines(" ");
        }
        return this;
    }
    /**
   * Writes a space.
   * @param times - Number of times to write a space.
   */ space(times = 1) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(" ".repeat(times));
        return this;
    }
    /**
   * Writes a tab if the last character was not a tab.
   */ tabIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastTab()) {
            this._writeIndentingNewLines("\t");
        }
        return this;
    }
    /**
   * Writes a tab.
   * @param times - Number of times to write a tab.
   */ tab(times = 1) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines("\t".repeat(times));
        return this;
    }
    conditionalWrite(condition, textOrFunc) {
        if (condition) {
            this.write(getStringFromStrOrFunc(textOrFunc));
        }
        return this;
    }
    /**
   * Writes the provided text.
   * @param text - Text to write.
   */ write(text) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(text);
        return this;
    }
    /**
   * Writes text to exit a comment if in a comment.
   */ closeComment() {
        const commentChar = this._currentCommentChar;
        switch(commentChar){
            case CommentChar.Line:
                this.newLine();
                break;
            case CommentChar.Star:
                if (!this.isLastNewLine()) {
                    this.spaceIfLastNot();
                }
                this.write("*/");
                break;
            default:
                {
                    const _assertUndefined = commentChar;
                    break;
                }
        }
        return this;
    }
    /**
   * Inserts text at the provided position.
   *
   * This method is "unsafe" because it won't update the state of the writer unless
   * inserting at the end position. It is biased towards being fast at inserting closer
   * to the start or end, but slower to insert in the middle. Only use this if
   * absolutely necessary.
   * @param pos - Position to insert at.
   * @param text - Text to insert.
   */ unsafeInsert(pos, text) {
        const textLength = this._length;
        const texts = this._texts;
        verifyInput();
        if (pos === textLength) {
            return this.write(text);
        }
        updateInternalArray();
        this._length += text.length;
        return this;
        function verifyInput() {
            if (pos < 0) {
                throw new Error(`Provided position of '${pos}' was less than zero.`);
            }
            if (pos > textLength) {
                throw new Error(`Provided position of '${pos}' was greater than the text length of '${textLength}'.`);
            }
        }
        function updateInternalArray() {
            const { index , localIndex  } = getArrayIndexAndLocalIndex();
            if (localIndex === 0) {
                texts.splice(index, 0, text);
            } else if (localIndex === texts[index].length) {
                texts.splice(index + 1, 0, text);
            } else {
                const textItem = texts[index];
                const startText = textItem.substring(0, localIndex);
                const endText = textItem.substring(localIndex);
                texts.splice(index, 1, startText, text, endText);
            }
        }
        function getArrayIndexAndLocalIndex() {
            if (pos < textLength / 2) {
                // start searching from the front
                let endPos = 0;
                for(let i = 0; i < texts.length; i++){
                    const textItem = texts[i];
                    const startPos = endPos;
                    endPos += textItem.length;
                    if (endPos >= pos) {
                        return {
                            index: i,
                            localIndex: pos - startPos
                        };
                    }
                }
            } else {
                // start searching from the back
                let startPos1 = textLength;
                for(let i1 = texts.length - 1; i1 >= 0; i1--){
                    const textItem1 = texts[i1];
                    startPos1 -= textItem1.length;
                    if (startPos1 <= pos) {
                        return {
                            index: i1,
                            localIndex: pos - startPos1
                        };
                    }
                }
            }
            throw new Error("Unhandled situation inserting. This should never happen.");
        }
    }
    /**
   * Gets the length of the string in the writer.
   */ getLength() {
        return this._length;
    }
    /**
   * Gets if the writer is currently in a comment.
   */ isInComment() {
        return this._currentCommentChar !== undefined;
    }
    /**
   * Gets if the writer is currently at the start of the first line of the text, block, or indentation block.
   */ isAtStartOfFirstLineOfBlock() {
        return this.isOnFirstLineOfBlock() && (this.isLastNewLine() || this.getLastChar() == null);
    }
    /**
   * Gets if the writer is currently on the first line of the text, block, or indentation block.
   */ isOnFirstLineOfBlock() {
        return this._isOnFirstLineOfBlock;
    }
    /**
   * Gets if the writer is currently in a string.
   */ isInString() {
        return this._stringCharStack.length > 0 && this._stringCharStack[this._stringCharStack.length - 1] !== CHARS.OPEN_BRACE;
    }
    /**
   * Gets if the last chars written were for a newline.
   */ isLastNewLine() {
        const lastChar = this.getLastChar();
        return lastChar === "\n" || lastChar === "\r";
    }
    /**
   * Gets if the last chars written were for a blank line.
   */ isLastBlankLine() {
        let foundCount = 0;
        // todo: consider extracting out iterating over past characters, but don't use
        // an iterator because it will be slow.
        for(let i = this._texts.length - 1; i >= 0; i--){
            const currentText = this._texts[i];
            for(let j = currentText.length - 1; j >= 0; j--){
                const currentChar = currentText.charCodeAt(j);
                if (currentChar === CHARS.NEW_LINE) {
                    foundCount++;
                    if (foundCount === 2) {
                        return true;
                    }
                } else if (currentChar !== CHARS.CARRIAGE_RETURN) {
                    return false;
                }
            }
        }
        return false;
    }
    /**
   * Gets if the last char written was a space.
   */ isLastSpace() {
        return this.getLastChar() === " ";
    }
    /**
   * Gets if the last char written was a tab.
   */ isLastTab() {
        return this.getLastChar() === "\t";
    }
    /**
   * Gets the last char written.
   */ getLastChar() {
        const charCode = this._getLastCharCodeWithOffset(0);
        return charCode == null ? undefined : String.fromCharCode(charCode);
    }
    /**
   * Gets if the writer ends with the provided text.
   * @param text - Text to check if the writer ends with the provided text.
   */ endsWith(text) {
        const length = this._length;
        return this.iterateLastCharCodes((charCode, index)=>{
            const offset = length - index;
            const textIndex = text.length - offset;
            if (text.charCodeAt(textIndex) !== charCode) {
                return false;
            }
            return textIndex === 0 ? true : undefined;
        }) || false;
    }
    /**
   * Iterates over the writer characters in reverse order. The iteration stops when a non-null or
   * undefined value is returned from the action. The returned value is then returned by the method.
   *
   * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
   * will combine the internal array into a string.
   */ iterateLastChars(action) {
        return this.iterateLastCharCodes((charCode, index)=>action(String.fromCharCode(charCode), index));
    }
    /**
   * Iterates over the writer character char codes in reverse order. The iteration stops when a non-null or
   * undefined value is returned from the action. The returned value is then returned by the method.
   *
   * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
   * will combine the internal array into a string. Additionally, this is slightly more efficient that
   * `iterateLastChars` as this won't allocate a string per character.
   */ iterateLastCharCodes(action) {
        let index = this._length;
        for(let i = this._texts.length - 1; i >= 0; i--){
            const currentText = this._texts[i];
            for(let j = currentText.length - 1; j >= 0; j--){
                index--;
                const result = action(currentText.charCodeAt(j), index);
                if (result != null) {
                    return result;
                }
            }
        }
        return undefined;
    }
    /**
   * Gets the writer's text.
   */ toString() {
        if (this._texts.length > 1) {
            const text = this._texts.join("");
            this._texts.length = 0;
            this._texts.push(text);
        }
        return this._texts[0] || "";
    }
    /** @internal */ static _newLineRegEx = /\r?\n/;
    /** @internal */ _writeIndentingNewLines(text) {
        text = text || "";
        if (text.length === 0) {
            writeIndividual(this, "");
            return;
        }
        const items = text.split(CodeBlockWriter._newLineRegEx);
        items.forEach((s, i)=>{
            if (i > 0) {
                this._baseWriteNewline();
            }
            if (s.length === 0) {
                return;
            }
            writeIndividual(this, s);
        });
        function writeIndividual(writer, s) {
            if (!writer.isInString()) {
                const isAtStartOfLine = writer.isLastNewLine() || writer.getLastChar() == null;
                if (isAtStartOfLine) {
                    writer._writeIndentation();
                }
            }
            writer._updateInternalState(s);
            writer._internalWrite(s);
        }
    }
    /** @internal */ _baseWriteNewline() {
        if (this._currentCommentChar === CommentChar.Line) {
            this._currentCommentChar = undefined;
        }
        const lastStringCharOnStack = this._stringCharStack[this._stringCharStack.length - 1];
        if ((lastStringCharOnStack === CHARS.DOUBLE_QUOTE || lastStringCharOnStack === CHARS.SINGLE_QUOTE) && this._getLastCharCodeWithOffset(0) !== CHARS.BACK_SLASH) {
            this._stringCharStack.pop();
        }
        this._internalWrite(this._newLine);
        this._isOnFirstLineOfBlock = false;
        this._dequeueQueuedIndentation();
    }
    /** @internal */ _dequeueQueuedIndentation() {
        if (this._queuedIndentation == null) {
            return;
        }
        if (this._queuedOnlyIfNotBlock && wasLastBlock(this)) {
            this._queuedIndentation = undefined;
            this._queuedOnlyIfNotBlock = undefined;
        } else {
            this._currentIndentation = this._queuedIndentation;
            this._queuedIndentation = undefined;
        }
        function wasLastBlock(writer) {
            let foundNewLine = false;
            return writer.iterateLastCharCodes((charCode)=>{
                switch(charCode){
                    case CHARS.NEW_LINE:
                        if (foundNewLine) {
                            return false;
                        } else {
                            foundNewLine = true;
                        }
                        break;
                    case CHARS.CARRIAGE_RETURN:
                        return undefined;
                    case CHARS.OPEN_BRACE:
                        return true;
                    default:
                        return false;
                }
            });
        }
    }
    /** @internal */ _updateInternalState(str) {
        for(let i = 0; i < str.length; i++){
            const currentChar = str.charCodeAt(i);
            // This is a performance optimization to short circuit all the checks below. If the current char
            // is not in this set then it won't change any internal state so no need to continue and do
            // so many other checks (this made it 3x faster in one scenario I tested).
            if (!isCharToHandle.has(currentChar)) {
                continue;
            }
            const pastChar = i === 0 ? this._getLastCharCodeWithOffset(0) : str.charCodeAt(i - 1);
            const pastPastChar = i === 0 ? this._getLastCharCodeWithOffset(1) : i === 1 ? this._getLastCharCodeWithOffset(0) : str.charCodeAt(i - 2);
            // handle regex
            if (this._isInRegEx) {
                if (pastChar === CHARS.FORWARD_SLASH && pastPastChar !== CHARS.BACK_SLASH || pastChar === CHARS.NEW_LINE) {
                    this._isInRegEx = false;
                } else {
                    continue;
                }
            } else if (!this.isInString() && !this.isInComment() && isRegExStart(currentChar, pastChar, pastPastChar)) {
                this._isInRegEx = true;
                continue;
            }
            // handle comments
            if (this._currentCommentChar == null && pastChar === CHARS.FORWARD_SLASH && currentChar === CHARS.FORWARD_SLASH) {
                this._currentCommentChar = CommentChar.Line;
            } else if (this._currentCommentChar == null && pastChar === CHARS.FORWARD_SLASH && currentChar === CHARS.ASTERISK) {
                this._currentCommentChar = CommentChar.Star;
            } else if (this._currentCommentChar === CommentChar.Star && pastChar === CHARS.ASTERISK && currentChar === CHARS.FORWARD_SLASH) {
                this._currentCommentChar = undefined;
            }
            if (this.isInComment()) {
                continue;
            }
            // handle strings
            const lastStringCharOnStack = this._stringCharStack.length === 0 ? undefined : this._stringCharStack[this._stringCharStack.length - 1];
            if (pastChar !== CHARS.BACK_SLASH && (currentChar === CHARS.DOUBLE_QUOTE || currentChar === CHARS.SINGLE_QUOTE || currentChar === CHARS.BACK_TICK)) {
                if (lastStringCharOnStack === currentChar) {
                    this._stringCharStack.pop();
                } else if (lastStringCharOnStack === CHARS.OPEN_BRACE || lastStringCharOnStack === undefined) {
                    this._stringCharStack.push(currentChar);
                }
            } else if (pastPastChar !== CHARS.BACK_SLASH && pastChar === CHARS.DOLLAR_SIGN && currentChar === CHARS.OPEN_BRACE && lastStringCharOnStack === CHARS.BACK_TICK) {
                this._stringCharStack.push(currentChar);
            } else if (currentChar === CHARS.CLOSE_BRACE && lastStringCharOnStack === CHARS.OPEN_BRACE) {
                this._stringCharStack.pop();
            }
        }
    }
    /** @internal - This is private, but exposed for testing. */ _getLastCharCodeWithOffset(offset) {
        if (offset >= this._length || offset < 0) {
            return undefined;
        }
        for(let i = this._texts.length - 1; i >= 0; i--){
            const currentText = this._texts[i];
            if (offset >= currentText.length) {
                offset -= currentText.length;
            } else {
                return currentText.charCodeAt(currentText.length - 1 - offset);
            }
        }
        return undefined;
    }
    /** @internal */ _writeIndentation() {
        const flooredIndentation = Math.floor(this._currentIndentation);
        this._internalWrite(this._indentationText.repeat(flooredIndentation));
        const overflow = this._currentIndentation - flooredIndentation;
        if (this._useTabs) {
            if (overflow > 0.5) {
                this._internalWrite(this._indentationText);
            }
        } else {
            const portion = Math.round(this._indentationText.length * overflow);
            // build up the string first, then append it for performance reasons
            let text = "";
            for(let i = 0; i < portion; i++){
                text += this._indentationText[i];
            }
            this._internalWrite(text);
        }
    }
    /** @internal */ _newLineIfNewLineOnNextWrite() {
        if (!this._newLineOnNextWrite) {
            return;
        }
        this._newLineOnNextWrite = false;
        this.newLine();
    }
    /** @internal */ _internalWrite(text) {
        if (text.length === 0) {
            return;
        }
        this._texts.push(text);
        this._length += text.length;
    }
    /** @internal */ static _spacesOrTabsRegEx = /^[ \t]*$/;
    /** @internal */ _getIndentationLevelFromArg(countOrText) {
        if (typeof countOrText === "number") {
            if (countOrText < 0) {
                throw new Error("Passed in indentation level should be greater than or equal to 0.");
            }
            return countOrText;
        } else if (typeof countOrText === "string") {
            if (!CodeBlockWriter._spacesOrTabsRegEx.test(countOrText)) {
                throw new Error("Provided string must be empty or only contain spaces or tabs.");
            }
            const { spacesCount , tabsCount  } = getSpacesAndTabsCount(countOrText);
            return tabsCount + spacesCount / this._indentNumberOfSpaces;
        } else {
            throw new Error("Argument provided must be a string or number.");
        }
    }
    /** @internal */ _setIndentationState(state) {
        this._currentIndentation = state.current;
        this._queuedIndentation = state.queued;
        this._queuedOnlyIfNotBlock = state.queuedOnlyIfNotBlock;
    }
    /** @internal */ _getIndentationState() {
        return {
            current: this._currentIndentation,
            queued: this._queuedIndentation,
            queuedOnlyIfNotBlock: this._queuedOnlyIfNotBlock
        };
    }
}
function isRegExStart(currentChar, pastChar, pastPastChar) {
    return pastChar === CHARS.FORWARD_SLASH && currentChar !== CHARS.FORWARD_SLASH && currentChar !== CHARS.ASTERISK && pastPastChar !== CHARS.ASTERISK && pastPastChar !== CHARS.FORWARD_SLASH;
}
function getIndentationText(useTabs, numberSpaces) {
    if (useTabs) {
        return "\t";
    }
    return Array(numberSpaces + 1).join(" ");
}
function getSpacesAndTabsCount(str) {
    let spacesCount = 0;
    let tabsCount = 0;
    for(let i = 0; i < str.length; i++){
        const charCode = str.charCodeAt(i);
        if (charCode === CHARS.SPACE) {
            spacesCount++;
        } else if (charCode === CHARS.TAB) {
            tabsCount++;
        }
    }
    return {
        spacesCount,
        tabsCount
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL2NvZGUtYmxvY2std3JpdGVyQDExLjAuMy9tb2QudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZXNjYXBlRm9yV2l0aGluU3RyaW5nLCBnZXRTdHJpbmdGcm9tU3RyT3JGdW5jIH0gZnJvbSBcIi4vdXRpbHMvc3RyaW5nX3V0aWxzLnRzXCI7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbmVudW0gQ29tbWVudENoYXIge1xuICBMaW5lLFxuICBTdGFyLFxufVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHRoZSB3cml0ZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBOZXdsaW5lIGNoYXJhY3Rlci5cbiAgICogQHJlbWFya3MgRGVmYXVsdHMgdG8gXFxuLlxuICAgKi9cbiAgbmV3TGluZTogXCJcXG5cIiB8IFwiXFxyXFxuXCI7XG4gIC8qKlxuICAgKiBOdW1iZXIgb2Ygc3BhY2VzIHRvIGluZGVudCB3aGVuIGB1c2VUYWJzYCBpcyBmYWxzZS5cbiAgICogQHJlbWFya3MgRGVmYXVsdHMgdG8gNC5cbiAgICovXG4gIGluZGVudE51bWJlck9mU3BhY2VzOiBudW1iZXI7XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSB0YWJzICh0cnVlKSBvciBzcGFjZXMgKGZhbHNlKS5cbiAgICogQHJlbWFya3MgRGVmYXVsdHMgdG8gZmFsc2UuXG4gICAqL1xuICB1c2VUYWJzOiBib29sZWFuO1xuICAvKipcbiAgICogV2hldGhlciB0byB1c2UgYSBzaW5nbGUgcXVvdGUgKHRydWUpIG9yIGRvdWJsZSBxdW90ZSAoZmFsc2UpLlxuICAgKiBAcmVtYXJrcyBEZWZhdWx0cyB0byBmYWxzZS5cbiAgICovXG4gIHVzZVNpbmdsZVF1b3RlOiBib29sZWFuO1xufVxuXG4vLyBVc2luZyB0aGUgY2hhciBjb2RlcyBpcyBhIHBlcmZvcm1hbmNlIGltcHJvdmVtZW50IChhYm91dCA1LjUlIGZhc3RlciB3aGVuIHdyaXRpbmcgYmVjYXVzZSBpdCBlbGltaW5hdGVzIGFkZGl0aW9uYWwgc3RyaW5nIGFsbG9jYXRpb25zKS5cbmNvbnN0IENIQVJTID0ge1xuICBCQUNLX1NMQVNIOiBcIlxcXFxcIi5jaGFyQ29kZUF0KDApLFxuICBGT1JXQVJEX1NMQVNIOiBcIi9cIi5jaGFyQ29kZUF0KDApLFxuICBORVdfTElORTogXCJcXG5cIi5jaGFyQ29kZUF0KDApLFxuICBDQVJSSUFHRV9SRVRVUk46IFwiXFxyXCIuY2hhckNvZGVBdCgwKSxcbiAgQVNURVJJU0s6IFwiKlwiLmNoYXJDb2RlQXQoMCksXG4gIERPVUJMRV9RVU9URTogXCJcXFwiXCIuY2hhckNvZGVBdCgwKSxcbiAgU0lOR0xFX1FVT1RFOiBcIidcIi5jaGFyQ29kZUF0KDApLFxuICBCQUNLX1RJQ0s6IFwiYFwiLmNoYXJDb2RlQXQoMCksXG4gIE9QRU5fQlJBQ0U6IFwie1wiLmNoYXJDb2RlQXQoMCksXG4gIENMT1NFX0JSQUNFOiBcIn1cIi5jaGFyQ29kZUF0KDApLFxuICBET0xMQVJfU0lHTjogXCIkXCIuY2hhckNvZGVBdCgwKSxcbiAgU1BBQ0U6IFwiIFwiLmNoYXJDb2RlQXQoMCksXG4gIFRBQjogXCJcXHRcIi5jaGFyQ29kZUF0KDApLFxufTtcbmNvbnN0IGlzQ2hhclRvSGFuZGxlID0gbmV3IFNldDxudW1iZXI+KFtcbiAgQ0hBUlMuQkFDS19TTEFTSCxcbiAgQ0hBUlMuRk9SV0FSRF9TTEFTSCxcbiAgQ0hBUlMuTkVXX0xJTkUsXG4gIENIQVJTLkNBUlJJQUdFX1JFVFVSTixcbiAgQ0hBUlMuQVNURVJJU0ssXG4gIENIQVJTLkRPVUJMRV9RVU9URSxcbiAgQ0hBUlMuU0lOR0xFX1FVT1RFLFxuICBDSEFSUy5CQUNLX1RJQ0ssXG4gIENIQVJTLk9QRU5fQlJBQ0UsXG4gIENIQVJTLkNMT1NFX0JSQUNFLFxuXSk7XG5cbi8qKlxuICogQ29kZSB3cml0ZXIgdGhhdCBhc3Npc3RzIHdpdGggZm9ybWF0dGluZyBhbmQgdmlzdWFsaXppbmcgYmxvY2tzIG9mIEphdmFTY3JpcHQgb3IgVHlwZVNjcmlwdCBjb2RlLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb2RlQmxvY2tXcml0ZXIge1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgcmVhZG9ubHkgX2luZGVudGF0aW9uVGV4dDogc3RyaW5nO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgcmVhZG9ubHkgX25ld0xpbmU6IFwiXFxuXCIgfCBcIlxcclxcblwiO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgcmVhZG9ubHkgX3VzZVRhYnM6IGJvb2xlYW47XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfcXVvdGVDaGFyOiBzdHJpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfaW5kZW50TnVtYmVyT2ZTcGFjZXM6IG51bWJlcjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9jdXJyZW50SW5kZW50YXRpb24gPSAwO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX3F1ZXVlZEluZGVudGF0aW9uOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfcXVldWVkT25seUlmTm90QmxvY2s6IHRydWUgfCB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfbGVuZ3RoID0gMDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9uZXdMaW5lT25OZXh0V3JpdGUgPSBmYWxzZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9jdXJyZW50Q29tbWVudENoYXI6IENvbW1lbnRDaGFyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX3N0cmluZ0NoYXJTdGFjazogbnVtYmVyW10gPSBbXTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9pc0luUmVnRXggPSBmYWxzZTtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9pc09uRmlyc3RMaW5lT2ZCbG9jayA9IHRydWU7XG4gIC8vIEFuIGFycmF5IG9mIHN0cmluZ3MgaXMgdXNlZCByYXRoZXIgdGhhbiBhIHNpbmdsZSBzdHJpbmcgYmVjYXVzZSBpdCB3YXNcbiAgLy8gZm91bmQgdG8gYmUgfjExeCBmYXN0ZXIgd2hlbiBwcmludGluZyBhIDEwSyBsaW5lIGZpbGUgKH4xMXMgdG8gfjFzKS5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF90ZXh0czogc3RyaW5nW10gPSBbXTtcblxuICAvKipcbiAgICogQ29uc3RydWN0b3IuXG4gICAqIEBwYXJhbSBvcHRzIC0gT3B0aW9ucyBmb3IgdGhlIHdyaXRlci5cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdHM6IFBhcnRpYWw8T3B0aW9ucz4gPSB7fSkge1xuICAgIHRoaXMuX25ld0xpbmUgPSBvcHRzLm5ld0xpbmUgfHwgXCJcXG5cIjtcbiAgICB0aGlzLl91c2VUYWJzID0gb3B0cy51c2VUYWJzIHx8IGZhbHNlO1xuICAgIHRoaXMuX2luZGVudE51bWJlck9mU3BhY2VzID0gb3B0cy5pbmRlbnROdW1iZXJPZlNwYWNlcyB8fCA0O1xuICAgIHRoaXMuX2luZGVudGF0aW9uVGV4dCA9IGdldEluZGVudGF0aW9uVGV4dCh0aGlzLl91c2VUYWJzLCB0aGlzLl9pbmRlbnROdW1iZXJPZlNwYWNlcyk7XG4gICAgdGhpcy5fcXVvdGVDaGFyID0gb3B0cy51c2VTaW5nbGVRdW90ZSA/IFwiJ1wiIDogYFwiYDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBvcHRpb25zLlxuICAgKi9cbiAgZ2V0T3B0aW9ucygpOiBPcHRpb25zIHtcbiAgICByZXR1cm4ge1xuICAgICAgaW5kZW50TnVtYmVyT2ZTcGFjZXM6IHRoaXMuX2luZGVudE51bWJlck9mU3BhY2VzLFxuICAgICAgbmV3TGluZTogdGhpcy5fbmV3TGluZSxcbiAgICAgIHVzZVRhYnM6IHRoaXMuX3VzZVRhYnMsXG4gICAgICB1c2VTaW5nbGVRdW90ZTogdGhpcy5fcXVvdGVDaGFyID09PSBcIidcIixcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFF1ZXVlcyB0aGUgaW5kZW50YXRpb24gbGV2ZWwgZm9yIHRoZSBuZXh0IGxpbmVzIHdyaXR0ZW4uXG4gICAqIEBwYXJhbSBpbmRlbnRhdGlvbkxldmVsIC0gSW5kZW50YXRpb24gbGV2ZWwgdG8gcXVldWUuXG4gICAqL1xuICBxdWV1ZUluZGVudGF0aW9uTGV2ZWwoaW5kZW50YXRpb25MZXZlbDogbnVtYmVyKTogdGhpcztcbiAgLyoqXG4gICAqIFF1ZXVlcyB0aGUgaW5kZW50YXRpb24gbGV2ZWwgZm9yIHRoZSBuZXh0IGxpbmVzIHdyaXR0ZW4gdXNpbmcgdGhlIHByb3ZpZGVkIGluZGVudGF0aW9uIHRleHQuXG4gICAqIEBwYXJhbSB3aGl0ZXNwYWNlVGV4dCAtIEdldHMgdGhlIGluZGVudGF0aW9uIGxldmVsIGZyb20gdGhlIGluZGVudGF0aW9uIHRleHQuXG4gICAqL1xuICBxdWV1ZUluZGVudGF0aW9uTGV2ZWwod2hpdGVzcGFjZVRleHQ6IHN0cmluZyk6IHRoaXM7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcXVldWVJbmRlbnRhdGlvbkxldmVsKGNvdW50T3JUZXh0OiBzdHJpbmcgfCBudW1iZXIpOiB0aGlzO1xuICBxdWV1ZUluZGVudGF0aW9uTGV2ZWwoY291bnRPclRleHQ6IHN0cmluZyB8IG51bWJlcikge1xuICAgIHRoaXMuX3F1ZXVlZEluZGVudGF0aW9uID0gdGhpcy5fZ2V0SW5kZW50YXRpb25MZXZlbEZyb21BcmcoY291bnRPclRleHQpO1xuICAgIHRoaXMuX3F1ZXVlZE9ubHlJZk5vdEJsb2NrID0gdW5kZWZpbmVkO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyB0aGUgdGV4dCB3aXRoaW4gdGhlIHByb3ZpZGVkIGFjdGlvbiB3aXRoIGhhbmdpbmcgaW5kZW50YXRpb24uXG4gICAqIEBwYXJhbSBhY3Rpb24gLSBBY3Rpb24gdG8gcGVyZm9ybSB3aXRoIGhhbmdpbmcgaW5kZW50YXRpb24uXG4gICAqL1xuICBoYW5naW5nSW5kZW50KGFjdGlvbjogKCkgPT4gdm9pZCk6IHRoaXMge1xuICAgIHJldHVybiB0aGlzLl93aXRoUmVzZXRJbmRlbnRhdGlvbigoKSA9PiB0aGlzLnF1ZXVlSW5kZW50YXRpb25MZXZlbCh0aGlzLmdldEluZGVudGF0aW9uTGV2ZWwoKSArIDEpLCBhY3Rpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyB0aGUgdGV4dCB3aXRoaW4gdGhlIHByb3ZpZGVkIGFjdGlvbiB3aXRoIGhhbmdpbmcgaW5kZW50YXRpb24gdW5sZXNzIHdyaXRpbmcgYSBibG9jay5cbiAgICogQHBhcmFtIGFjdGlvbiAtIEFjdGlvbiB0byBwZXJmb3JtIHdpdGggaGFuZ2luZyBpbmRlbnRhdGlvbiB1bmxlc3MgYSBibG9jayBpcyB3cml0dGVuLlxuICAgKi9cbiAgaGFuZ2luZ0luZGVudFVubGVzc0Jsb2NrKGFjdGlvbjogKCkgPT4gdm9pZCk6IHRoaXMge1xuICAgIHJldHVybiB0aGlzLl93aXRoUmVzZXRJbmRlbnRhdGlvbigoKSA9PiB7XG4gICAgICB0aGlzLnF1ZXVlSW5kZW50YXRpb25MZXZlbCh0aGlzLmdldEluZGVudGF0aW9uTGV2ZWwoKSArIDEpO1xuICAgICAgdGhpcy5fcXVldWVkT25seUlmTm90QmxvY2sgPSB0cnVlO1xuICAgIH0sIGFjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBpbmRlbnRhdGlvbiBsZXZlbC5cbiAgICogQHBhcmFtIGluZGVudGF0aW9uTGV2ZWwgLSBJbmRlbnRhdGlvbiBsZXZlbCB0byBiZSBhdC5cbiAgICovXG4gIHNldEluZGVudGF0aW9uTGV2ZWwoaW5kZW50YXRpb25MZXZlbDogbnVtYmVyKTogdGhpcztcbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgaW5kZW50YXRpb24gdXNpbmcgdGhlIHByb3ZpZGVkIGluZGVudGF0aW9uIHRleHQuXG4gICAqIEBwYXJhbSB3aGl0ZXNwYWNlVGV4dCAtIEdldHMgdGhlIGluZGVudGF0aW9uIGxldmVsIGZyb20gdGhlIGluZGVudGF0aW9uIHRleHQuXG4gICAqL1xuICBzZXRJbmRlbnRhdGlvbkxldmVsKHdoaXRlc3BhY2VUZXh0OiBzdHJpbmcpOiB0aGlzO1xuICAvKiogQGludGVybmFsICovXG4gIHNldEluZGVudGF0aW9uTGV2ZWwoY291bnRPclRleHQ6IHN0cmluZyB8IG51bWJlcik6IHRoaXM7XG4gIHNldEluZGVudGF0aW9uTGV2ZWwoY291bnRPclRleHQ6IHN0cmluZyB8IG51bWJlcikge1xuICAgIHRoaXMuX2N1cnJlbnRJbmRlbnRhdGlvbiA9IHRoaXMuX2dldEluZGVudGF0aW9uTGV2ZWxGcm9tQXJnKGNvdW50T3JUZXh0KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBpbmRlbnRhdGlvbiBsZXZlbCB3aXRoaW4gdGhlIHByb3ZpZGVkIGFjdGlvbiBhbmQgcmVzdG9yZXMgdGhlIHdyaXRlcidzIGluZGVudGF0aW9uXG4gICAqIHN0YXRlIGFmdGVyd2FyZHMuXG4gICAqIEByZW1hcmtzIFJlc3RvcmVzIHRoZSB3cml0ZXIncyBzdGF0ZSBhZnRlciB0aGUgYWN0aW9uLlxuICAgKiBAcGFyYW0gaW5kZW50YXRpb25MZXZlbCAtIEluZGVudGF0aW9uIGxldmVsIHRvIHNldC5cbiAgICogQHBhcmFtIGFjdGlvbiAtIEFjdGlvbiB0byBwZXJmb3JtIHdpdGggdGhlIGluZGVudGF0aW9uLlxuICAgKi9cbiAgd2l0aEluZGVudGF0aW9uTGV2ZWwoaW5kZW50YXRpb25MZXZlbDogbnVtYmVyLCBhY3Rpb246ICgpID0+IHZvaWQpOiB0aGlzO1xuICAvKipcbiAgICogU2V0cyB0aGUgaW5kZW50YXRpb24gbGV2ZWwgd2l0aCB0aGUgcHJvdmlkZWQgaW5kZW50YXRpb24gdGV4dCB3aXRoaW4gdGhlIHByb3ZpZGVkIGFjdGlvblxuICAgKiBhbmQgcmVzdG9yZXMgdGhlIHdyaXRlcidzIGluZGVudGF0aW9uIHN0YXRlIGFmdGVyd2FyZHMuXG4gICAqIEBwYXJhbSB3aGl0ZXNwYWNlVGV4dCAtIEdldHMgdGhlIGluZGVudGF0aW9uIGxldmVsIGZyb20gdGhlIGluZGVudGF0aW9uIHRleHQuXG4gICAqIEBwYXJhbSBhY3Rpb24gLSBBY3Rpb24gdG8gcGVyZm9ybSB3aXRoIHRoZSBpbmRlbnRhdGlvbi5cbiAgICovXG4gIHdpdGhJbmRlbnRhdGlvbkxldmVsKHdoaXRlc3BhY2VUZXh0OiBzdHJpbmcsIGFjdGlvbjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIHdpdGhJbmRlbnRhdGlvbkxldmVsKGNvdW50T3JUZXh0OiBzdHJpbmcgfCBudW1iZXIsIGFjdGlvbjogKCkgPT4gdm9pZCkge1xuICAgIHJldHVybiB0aGlzLl93aXRoUmVzZXRJbmRlbnRhdGlvbigoKSA9PiB0aGlzLnNldEluZGVudGF0aW9uTGV2ZWwoY291bnRPclRleHQpLCBhY3Rpb24pO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF93aXRoUmVzZXRJbmRlbnRhdGlvbihzZXRTdGF0ZUFjdGlvbjogKCkgPT4gdm9pZCwgd3JpdGVBY3Rpb246ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCBwcmV2aW91c1N0YXRlID0gdGhpcy5fZ2V0SW5kZW50YXRpb25TdGF0ZSgpO1xuICAgIHNldFN0YXRlQWN0aW9uKCk7XG4gICAgdHJ5IHtcbiAgICAgIHdyaXRlQWN0aW9uKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuX3NldEluZGVudGF0aW9uU3RhdGUocHJldmlvdXNTdGF0ZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGN1cnJlbnQgaW5kZW50YXRpb24gbGV2ZWwuXG4gICAqL1xuICBnZXRJbmRlbnRhdGlvbkxldmVsKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRJbmRlbnRhdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYSBibG9jayB1c2luZyBicmFjZXMuXG4gICAqIEBwYXJhbSBibG9jayAtIFdyaXRlIHVzaW5nIHRoZSB3cml0ZXIgd2l0aGluIHRoaXMgYmxvY2suXG4gICAqL1xuICBibG9jayhibG9jaz86ICgpID0+IHZvaWQpOiB0aGlzIHtcbiAgICB0aGlzLl9uZXdMaW5lSWZOZXdMaW5lT25OZXh0V3JpdGUoKTtcbiAgICBpZiAodGhpcy5nZXRMZW5ndGgoKSA+IDAgJiYgIXRoaXMuaXNMYXN0TmV3TGluZSgpKSB7XG4gICAgICB0aGlzLnNwYWNlSWZMYXN0Tm90KCk7XG4gICAgfVxuICAgIHRoaXMuaW5saW5lQmxvY2soYmxvY2spO1xuICAgIHRoaXMuX25ld0xpbmVPbk5leHRXcml0ZSA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGFuIGlubGluZSBibG9jayB3aXRoIGJyYWNlcy5cbiAgICogQHBhcmFtIGJsb2NrIC0gV3JpdGUgdXNpbmcgdGhlIHdyaXRlciB3aXRoaW4gdGhpcyBibG9jay5cbiAgICovXG4gIGlubGluZUJsb2NrKGJsb2NrPzogKCkgPT4gdm9pZCk6IHRoaXMge1xuICAgIHRoaXMuX25ld0xpbmVJZk5ld0xpbmVPbk5leHRXcml0ZSgpO1xuICAgIHRoaXMud3JpdGUoXCJ7XCIpO1xuICAgIHRoaXMuX2luZGVudEJsb2NrSW50ZXJuYWwoYmxvY2spO1xuICAgIHRoaXMubmV3TGluZUlmTGFzdE5vdCgpLndyaXRlKFwifVwiKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEluZGVudHMgdGhlIGNvZGUgb25lIGxldmVsIGZvciB0aGUgY3VycmVudCBsaW5lLlxuICAgKi9cbiAgaW5kZW50KHRpbWVzPzogbnVtYmVyKTogdGhpcztcbiAgLyoqXG4gICAqIEluZGVudHMgYSBibG9jayBvZiBjb2RlLlxuICAgKiBAcGFyYW0gYmxvY2sgLSBCbG9jayB0byBpbmRlbnQuXG4gICAqL1xuICBpbmRlbnQoYmxvY2s6ICgpID0+IHZvaWQpOiB0aGlzO1xuICBpbmRlbnQodGltZXNPckJsb2NrOiBudW1iZXIgfCAoKCkgPT4gdm9pZCkgPSAxKSB7XG4gICAgaWYgKHR5cGVvZiB0aW1lc09yQmxvY2sgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgIHRoaXMuX25ld0xpbmVJZk5ld0xpbmVPbk5leHRXcml0ZSgpO1xuICAgICAgcmV0dXJuIHRoaXMud3JpdGUodGhpcy5faW5kZW50YXRpb25UZXh0LnJlcGVhdCh0aW1lc09yQmxvY2spKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5faW5kZW50QmxvY2tJbnRlcm5hbCh0aW1lc09yQmxvY2spO1xuICAgICAgaWYgKCF0aGlzLmlzTGFzdE5ld0xpbmUoKSkge1xuICAgICAgICB0aGlzLl9uZXdMaW5lT25OZXh0V3JpdGUgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9pbmRlbnRCbG9ja0ludGVybmFsKGJsb2NrPzogKCkgPT4gdm9pZCkge1xuICAgIGlmICh0aGlzLmdldExhc3RDaGFyKCkgIT0gbnVsbCkge1xuICAgICAgdGhpcy5uZXdMaW5lSWZMYXN0Tm90KCk7XG4gICAgfVxuICAgIHRoaXMuX2N1cnJlbnRJbmRlbnRhdGlvbisrO1xuICAgIHRoaXMuX2lzT25GaXJzdExpbmVPZkJsb2NrID0gdHJ1ZTtcbiAgICBpZiAoYmxvY2sgIT0gbnVsbCkge1xuICAgICAgYmxvY2soKTtcbiAgICB9XG4gICAgdGhpcy5faXNPbkZpcnN0TGluZU9mQmxvY2sgPSBmYWxzZTtcbiAgICB0aGlzLl9jdXJyZW50SW5kZW50YXRpb24gPSBNYXRoLm1heCgwLCB0aGlzLl9jdXJyZW50SW5kZW50YXRpb24gLSAxKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25kaXRpb25hbGx5IHdyaXRlcyBhIGxpbmUgb2YgdGV4dC5cbiAgICogQHBhcmFtIGNvbmRpdGlvbiAtIENvbmRpdGlvbiB0byBldmFsdWF0ZS5cbiAgICogQHBhcmFtIHRleHRGdW5jIC0gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBzdHJpbmcgdG8gd3JpdGUgaWYgdGhlIGNvbmRpdGlvbiBpcyB0cnVlLlxuICAgKi9cbiAgY29uZGl0aW9uYWxXcml0ZUxpbmUoY29uZGl0aW9uOiBib29sZWFuIHwgdW5kZWZpbmVkLCB0ZXh0RnVuYzogKCkgPT4gc3RyaW5nKTogdGhpcztcbiAgLyoqXG4gICAqIENvbmRpdGlvbmFsbHkgd3JpdGVzIGEgbGluZSBvZiB0ZXh0LlxuICAgKiBAcGFyYW0gY29uZGl0aW9uIC0gQ29uZGl0aW9uIHRvIGV2YWx1YXRlLlxuICAgKiBAcGFyYW0gdGV4dCAtIFRleHQgdG8gd3JpdGUgaWYgdGhlIGNvbmRpdGlvbiBpcyB0cnVlLlxuICAgKi9cbiAgY29uZGl0aW9uYWxXcml0ZUxpbmUoY29uZGl0aW9uOiBib29sZWFuIHwgdW5kZWZpbmVkLCB0ZXh0OiBzdHJpbmcpOiB0aGlzO1xuICBjb25kaXRpb25hbFdyaXRlTGluZShjb25kaXRpb246IGJvb2xlYW4gfCB1bmRlZmluZWQsIHN0ck9yRnVuYzogc3RyaW5nIHwgKCgpID0+IHN0cmluZykpIHtcbiAgICBpZiAoY29uZGl0aW9uKSB7XG4gICAgICB0aGlzLndyaXRlTGluZShnZXRTdHJpbmdGcm9tU3RyT3JGdW5jKHN0ck9yRnVuYykpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIGxpbmUgb2YgdGV4dC5cbiAgICogQHBhcmFtIHRleHQgLSBTdHJpbmcgdG8gd3JpdGUuXG4gICAqL1xuICB3cml0ZUxpbmUodGV4dDogc3RyaW5nKTogdGhpcyB7XG4gICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG4gICAgaWYgKHRoaXMuZ2V0TGFzdENoYXIoKSAhPSBudWxsKSB7XG4gICAgICB0aGlzLm5ld0xpbmVJZkxhc3ROb3QoKTtcbiAgICB9XG4gICAgdGhpcy5fd3JpdGVJbmRlbnRpbmdOZXdMaW5lcyh0ZXh0KTtcbiAgICB0aGlzLm5ld0xpbmUoKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIG5ld2xpbmUgaWYgdGhlIGxhc3QgbGluZSB3YXMgbm90IGEgbmV3bGluZS5cbiAgICovXG4gIG5ld0xpbmVJZkxhc3ROb3QoKTogdGhpcyB7XG4gICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG5cbiAgICBpZiAoIXRoaXMuaXNMYXN0TmV3TGluZSgpKSB7XG4gICAgICB0aGlzLm5ld0xpbmUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYSBibGFuayBsaW5lIGlmIHRoZSBsYXN0IHdyaXR0ZW4gdGV4dCB3YXMgbm90IGEgYmxhbmsgbGluZS5cbiAgICovXG4gIGJsYW5rTGluZUlmTGFzdE5vdCgpOiB0aGlzIHtcbiAgICBpZiAoIXRoaXMuaXNMYXN0QmxhbmtMaW5lKCkpIHtcbiAgICAgIHRoaXMuYmxhbmtMaW5lKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIGJsYW5rIGxpbmUgaWYgdGhlIGNvbmRpdGlvbiBpcyB0cnVlLlxuICAgKiBAcGFyYW0gY29uZGl0aW9uIC0gQ29uZGl0aW9uIHRvIGV2YWx1YXRlLlxuICAgKi9cbiAgY29uZGl0aW9uYWxCbGFua0xpbmUoY29uZGl0aW9uOiBib29sZWFuIHwgdW5kZWZpbmVkKTogdGhpcyB7XG4gICAgaWYgKGNvbmRpdGlvbikge1xuICAgICAgdGhpcy5ibGFua0xpbmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgYmxhbmsgbGluZS5cbiAgICovXG4gIGJsYW5rTGluZSgpOiB0aGlzIHtcbiAgICByZXR1cm4gdGhpcy5uZXdMaW5lSWZMYXN0Tm90KCkubmV3TGluZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIG5ld2xpbmUgaWYgdGhlIGNvbmRpdGlvbiBpcyB0cnVlLlxuICAgKiBAcGFyYW0gY29uZGl0aW9uIC0gQ29uZGl0aW9uIHRvIGV2YWx1YXRlLlxuICAgKi9cbiAgY29uZGl0aW9uYWxOZXdMaW5lKGNvbmRpdGlvbjogYm9vbGVhbiB8IHVuZGVmaW5lZCk6IHRoaXMge1xuICAgIGlmIChjb25kaXRpb24pIHtcbiAgICAgIHRoaXMubmV3TGluZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYSBuZXdsaW5lLlxuICAgKi9cbiAgbmV3TGluZSgpOiB0aGlzIHtcbiAgICB0aGlzLl9uZXdMaW5lT25OZXh0V3JpdGUgPSBmYWxzZTtcbiAgICB0aGlzLl9iYXNlV3JpdGVOZXdsaW5lKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgcXVvdGUgY2hhcmFjdGVyLlxuICAgKi9cbiAgcXVvdGUoKTogdGhpcztcbiAgLyoqXG4gICAqIFdyaXRlcyB0ZXh0IHN1cnJvdW5kZWQgaW4gcXVvdGVzLlxuICAgKiBAcGFyYW0gdGV4dCAtIFRleHQgdG8gd3JpdGUuXG4gICAqL1xuICBxdW90ZSh0ZXh0OiBzdHJpbmcpOiB0aGlzO1xuICBxdW90ZSh0ZXh0Pzogc3RyaW5nKSB7XG4gICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG4gICAgdGhpcy5fd3JpdGVJbmRlbnRpbmdOZXdMaW5lcyh0ZXh0ID09IG51bGwgPyB0aGlzLl9xdW90ZUNoYXIgOiB0aGlzLl9xdW90ZUNoYXIgKyBlc2NhcGVGb3JXaXRoaW5TdHJpbmcodGV4dCwgdGhpcy5fcXVvdGVDaGFyKSArIHRoaXMuX3F1b3RlQ2hhcik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgc3BhY2UgaWYgdGhlIGxhc3QgY2hhcmFjdGVyIHdhcyBub3QgYSBzcGFjZS5cbiAgICovXG4gIHNwYWNlSWZMYXN0Tm90KCk6IHRoaXMge1xuICAgIHRoaXMuX25ld0xpbmVJZk5ld0xpbmVPbk5leHRXcml0ZSgpO1xuXG4gICAgaWYgKCF0aGlzLmlzTGFzdFNwYWNlKCkpIHtcbiAgICAgIHRoaXMuX3dyaXRlSW5kZW50aW5nTmV3TGluZXMoXCIgXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIHNwYWNlLlxuICAgKiBAcGFyYW0gdGltZXMgLSBOdW1iZXIgb2YgdGltZXMgdG8gd3JpdGUgYSBzcGFjZS5cbiAgICovXG4gIHNwYWNlKHRpbWVzID0gMSk6IHRoaXMge1xuICAgIHRoaXMuX25ld0xpbmVJZk5ld0xpbmVPbk5leHRXcml0ZSgpO1xuICAgIHRoaXMuX3dyaXRlSW5kZW50aW5nTmV3TGluZXMoXCIgXCIucmVwZWF0KHRpbWVzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgdGFiIGlmIHRoZSBsYXN0IGNoYXJhY3RlciB3YXMgbm90IGEgdGFiLlxuICAgKi9cbiAgdGFiSWZMYXN0Tm90KCk6IHRoaXMge1xuICAgIHRoaXMuX25ld0xpbmVJZk5ld0xpbmVPbk5leHRXcml0ZSgpO1xuXG4gICAgaWYgKCF0aGlzLmlzTGFzdFRhYigpKSB7XG4gICAgICB0aGlzLl93cml0ZUluZGVudGluZ05ld0xpbmVzKFwiXFx0XCIpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIHRhYi5cbiAgICogQHBhcmFtIHRpbWVzIC0gTnVtYmVyIG9mIHRpbWVzIHRvIHdyaXRlIGEgdGFiLlxuICAgKi9cbiAgdGFiKHRpbWVzID0gMSk6IHRoaXMge1xuICAgIHRoaXMuX25ld0xpbmVJZk5ld0xpbmVPbk5leHRXcml0ZSgpO1xuICAgIHRoaXMuX3dyaXRlSW5kZW50aW5nTmV3TGluZXMoXCJcXHRcIi5yZXBlYXQodGltZXMpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25kaXRpb25hbGx5IHdyaXRlcyB0ZXh0LlxuICAgKiBAcGFyYW0gY29uZGl0aW9uIC0gQ29uZGl0aW9uIHRvIGV2YWx1YXRlLlxuICAgKiBAcGFyYW0gdGV4dEZ1bmMgLSBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHN0cmluZyB0byB3cml0ZSBpZiB0aGUgY29uZGl0aW9uIGlzIHRydWUuXG4gICAqL1xuICBjb25kaXRpb25hbFdyaXRlKGNvbmRpdGlvbjogYm9vbGVhbiB8IHVuZGVmaW5lZCwgdGV4dEZ1bmM6ICgpID0+IHN0cmluZyk6IHRoaXM7XG4gIC8qKlxuICAgKiBDb25kaXRpb25hbGx5IHdyaXRlcyB0ZXh0LlxuICAgKiBAcGFyYW0gY29uZGl0aW9uIC0gQ29uZGl0aW9uIHRvIGV2YWx1YXRlLlxuICAgKiBAcGFyYW0gdGV4dCAtIFRleHQgdG8gd3JpdGUgaWYgdGhlIGNvbmRpdGlvbiBpcyB0cnVlLlxuICAgKi9cbiAgY29uZGl0aW9uYWxXcml0ZShjb25kaXRpb246IGJvb2xlYW4gfCB1bmRlZmluZWQsIHRleHQ6IHN0cmluZyk6IHRoaXM7XG4gIGNvbmRpdGlvbmFsV3JpdGUoY29uZGl0aW9uOiBib29sZWFuIHwgdW5kZWZpbmVkLCB0ZXh0T3JGdW5jOiBzdHJpbmcgfCAoKCkgPT4gc3RyaW5nKSkge1xuICAgIGlmIChjb25kaXRpb24pIHtcbiAgICAgIHRoaXMud3JpdGUoZ2V0U3RyaW5nRnJvbVN0ck9yRnVuYyh0ZXh0T3JGdW5jKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIHRoZSBwcm92aWRlZCB0ZXh0LlxuICAgKiBAcGFyYW0gdGV4dCAtIFRleHQgdG8gd3JpdGUuXG4gICAqL1xuICB3cml0ZSh0ZXh0OiBzdHJpbmcpOiB0aGlzIHtcbiAgICB0aGlzLl9uZXdMaW5lSWZOZXdMaW5lT25OZXh0V3JpdGUoKTtcbiAgICB0aGlzLl93cml0ZUluZGVudGluZ05ld0xpbmVzKHRleHQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyB0ZXh0IHRvIGV4aXQgYSBjb21tZW50IGlmIGluIGEgY29tbWVudC5cbiAgICovXG4gIGNsb3NlQ29tbWVudCgpOiB0aGlzIHtcbiAgICBjb25zdCBjb21tZW50Q2hhciA9IHRoaXMuX2N1cnJlbnRDb21tZW50Q2hhcjtcblxuICAgIHN3aXRjaCAoY29tbWVudENoYXIpIHtcbiAgICAgIGNhc2UgQ29tbWVudENoYXIuTGluZTpcbiAgICAgICAgdGhpcy5uZXdMaW5lKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBDb21tZW50Q2hhci5TdGFyOlxuICAgICAgICBpZiAoIXRoaXMuaXNMYXN0TmV3TGluZSgpKSB7XG4gICAgICAgICAgdGhpcy5zcGFjZUlmTGFzdE5vdCgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud3JpdGUoXCIqL1wiKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OiB7XG4gICAgICAgIGNvbnN0IF9hc3NlcnRVbmRlZmluZWQ6IHVuZGVmaW5lZCA9IGNvbW1lbnRDaGFyO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnNlcnRzIHRleHQgYXQgdGhlIHByb3ZpZGVkIHBvc2l0aW9uLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpcyBcInVuc2FmZVwiIGJlY2F1c2UgaXQgd29uJ3QgdXBkYXRlIHRoZSBzdGF0ZSBvZiB0aGUgd3JpdGVyIHVubGVzc1xuICAgKiBpbnNlcnRpbmcgYXQgdGhlIGVuZCBwb3NpdGlvbi4gSXQgaXMgYmlhc2VkIHRvd2FyZHMgYmVpbmcgZmFzdCBhdCBpbnNlcnRpbmcgY2xvc2VyXG4gICAqIHRvIHRoZSBzdGFydCBvciBlbmQsIGJ1dCBzbG93ZXIgdG8gaW5zZXJ0IGluIHRoZSBtaWRkbGUuIE9ubHkgdXNlIHRoaXMgaWZcbiAgICogYWJzb2x1dGVseSBuZWNlc3NhcnkuXG4gICAqIEBwYXJhbSBwb3MgLSBQb3NpdGlvbiB0byBpbnNlcnQgYXQuXG4gICAqIEBwYXJhbSB0ZXh0IC0gVGV4dCB0byBpbnNlcnQuXG4gICAqL1xuICB1bnNhZmVJbnNlcnQocG9zOiBudW1iZXIsIHRleHQ6IHN0cmluZyk6IHRoaXMge1xuICAgIGNvbnN0IHRleHRMZW5ndGggPSB0aGlzLl9sZW5ndGg7XG4gICAgY29uc3QgdGV4dHMgPSB0aGlzLl90ZXh0cztcbiAgICB2ZXJpZnlJbnB1dCgpO1xuXG4gICAgaWYgKHBvcyA9PT0gdGV4dExlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMud3JpdGUodGV4dCk7XG4gICAgfVxuXG4gICAgdXBkYXRlSW50ZXJuYWxBcnJheSgpO1xuICAgIHRoaXMuX2xlbmd0aCArPSB0ZXh0Lmxlbmd0aDtcblxuICAgIHJldHVybiB0aGlzO1xuXG4gICAgZnVuY3Rpb24gdmVyaWZ5SW5wdXQoKSB7XG4gICAgICBpZiAocG9zIDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb3ZpZGVkIHBvc2l0aW9uIG9mICcke3Bvc30nIHdhcyBsZXNzIHRoYW4gemVyby5gKTtcbiAgICAgIH1cbiAgICAgIGlmIChwb3MgPiB0ZXh0TGVuZ3RoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUHJvdmlkZWQgcG9zaXRpb24gb2YgJyR7cG9zfScgd2FzIGdyZWF0ZXIgdGhhbiB0aGUgdGV4dCBsZW5ndGggb2YgJyR7dGV4dExlbmd0aH0nLmApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUludGVybmFsQXJyYXkoKSB7XG4gICAgICBjb25zdCB7IGluZGV4LCBsb2NhbEluZGV4IH0gPSBnZXRBcnJheUluZGV4QW5kTG9jYWxJbmRleCgpO1xuXG4gICAgICBpZiAobG9jYWxJbmRleCA9PT0gMCkge1xuICAgICAgICB0ZXh0cy5zcGxpY2UoaW5kZXgsIDAsIHRleHQpO1xuICAgICAgfSBlbHNlIGlmIChsb2NhbEluZGV4ID09PSB0ZXh0c1tpbmRleF0ubGVuZ3RoKSB7XG4gICAgICAgIHRleHRzLnNwbGljZShpbmRleCArIDEsIDAsIHRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgdGV4dEl0ZW0gPSB0ZXh0c1tpbmRleF07XG4gICAgICAgIGNvbnN0IHN0YXJ0VGV4dCA9IHRleHRJdGVtLnN1YnN0cmluZygwLCBsb2NhbEluZGV4KTtcbiAgICAgICAgY29uc3QgZW5kVGV4dCA9IHRleHRJdGVtLnN1YnN0cmluZyhsb2NhbEluZGV4KTtcbiAgICAgICAgdGV4dHMuc3BsaWNlKGluZGV4LCAxLCBzdGFydFRleHQsIHRleHQsIGVuZFRleHQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEFycmF5SW5kZXhBbmRMb2NhbEluZGV4KCkge1xuICAgICAgaWYgKHBvcyA8IHRleHRMZW5ndGggLyAyKSB7XG4gICAgICAgIC8vIHN0YXJ0IHNlYXJjaGluZyBmcm9tIHRoZSBmcm9udFxuICAgICAgICBsZXQgZW5kUG9zID0gMDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHRleHRJdGVtID0gdGV4dHNbaV07XG4gICAgICAgICAgY29uc3Qgc3RhcnRQb3MgPSBlbmRQb3M7XG4gICAgICAgICAgZW5kUG9zICs9IHRleHRJdGVtLmxlbmd0aDtcbiAgICAgICAgICBpZiAoZW5kUG9zID49IHBvcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgaW5kZXg6IGksIGxvY2FsSW5kZXg6IHBvcyAtIHN0YXJ0UG9zIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzdGFydCBzZWFyY2hpbmcgZnJvbSB0aGUgYmFja1xuICAgICAgICBsZXQgc3RhcnRQb3MgPSB0ZXh0TGVuZ3RoO1xuICAgICAgICBmb3IgKGxldCBpID0gdGV4dHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBjb25zdCB0ZXh0SXRlbSA9IHRleHRzW2ldO1xuICAgICAgICAgIHN0YXJ0UG9zIC09IHRleHRJdGVtLmxlbmd0aDtcbiAgICAgICAgICBpZiAoc3RhcnRQb3MgPD0gcG9zKSB7XG4gICAgICAgICAgICByZXR1cm4geyBpbmRleDogaSwgbG9jYWxJbmRleDogcG9zIC0gc3RhcnRQb3MgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5oYW5kbGVkIHNpdHVhdGlvbiBpbnNlcnRpbmcuIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbi5cIik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGxlbmd0aCBvZiB0aGUgc3RyaW5nIGluIHRoZSB3cml0ZXIuXG4gICAqL1xuICBnZXRMZW5ndGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fbGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgaWYgdGhlIHdyaXRlciBpcyBjdXJyZW50bHkgaW4gYSBjb21tZW50LlxuICAgKi9cbiAgaXNJbkNvbW1lbnQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRDb21tZW50Q2hhciAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgaWYgdGhlIHdyaXRlciBpcyBjdXJyZW50bHkgYXQgdGhlIHN0YXJ0IG9mIHRoZSBmaXJzdCBsaW5lIG9mIHRoZSB0ZXh0LCBibG9jaywgb3IgaW5kZW50YXRpb24gYmxvY2suXG4gICAqL1xuICBpc0F0U3RhcnRPZkZpcnN0TGluZU9mQmxvY2soKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNPbkZpcnN0TGluZU9mQmxvY2soKSAmJiAodGhpcy5pc0xhc3ROZXdMaW5lKCkgfHwgdGhpcy5nZXRMYXN0Q2hhcigpID09IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgaWYgdGhlIHdyaXRlciBpcyBjdXJyZW50bHkgb24gdGhlIGZpcnN0IGxpbmUgb2YgdGhlIHRleHQsIGJsb2NrLCBvciBpbmRlbnRhdGlvbiBibG9jay5cbiAgICovXG4gIGlzT25GaXJzdExpbmVPZkJsb2NrKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9pc09uRmlyc3RMaW5lT2ZCbG9jaztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGlmIHRoZSB3cml0ZXIgaXMgY3VycmVudGx5IGluIGEgc3RyaW5nLlxuICAgKi9cbiAgaXNJblN0cmluZygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fc3RyaW5nQ2hhclN0YWNrLmxlbmd0aCA+IDAgJiYgdGhpcy5fc3RyaW5nQ2hhclN0YWNrW3RoaXMuX3N0cmluZ0NoYXJTdGFjay5sZW5ndGggLSAxXSAhPT0gQ0hBUlMuT1BFTl9CUkFDRTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGlmIHRoZSBsYXN0IGNoYXJzIHdyaXR0ZW4gd2VyZSBmb3IgYSBuZXdsaW5lLlxuICAgKi9cbiAgaXNMYXN0TmV3TGluZSgpOiBib29sZWFuIHtcbiAgICBjb25zdCBsYXN0Q2hhciA9IHRoaXMuZ2V0TGFzdENoYXIoKTtcbiAgICByZXR1cm4gbGFzdENoYXIgPT09IFwiXFxuXCIgfHwgbGFzdENoYXIgPT09IFwiXFxyXCI7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBpZiB0aGUgbGFzdCBjaGFycyB3cml0dGVuIHdlcmUgZm9yIGEgYmxhbmsgbGluZS5cbiAgICovXG4gIGlzTGFzdEJsYW5rTGluZSgpOiBib29sZWFuIHtcbiAgICBsZXQgZm91bmRDb3VudCA9IDA7XG5cbiAgICAvLyB0b2RvOiBjb25zaWRlciBleHRyYWN0aW5nIG91dCBpdGVyYXRpbmcgb3ZlciBwYXN0IGNoYXJhY3RlcnMsIGJ1dCBkb24ndCB1c2VcbiAgICAvLyBhbiBpdGVyYXRvciBiZWNhdXNlIGl0IHdpbGwgYmUgc2xvdy5cbiAgICBmb3IgKGxldCBpID0gdGhpcy5fdGV4dHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gdGhpcy5fdGV4dHNbaV07XG4gICAgICBmb3IgKGxldCBqID0gY3VycmVudFRleHQubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgY29uc3QgY3VycmVudENoYXIgPSBjdXJyZW50VGV4dC5jaGFyQ29kZUF0KGopO1xuICAgICAgICBpZiAoY3VycmVudENoYXIgPT09IENIQVJTLk5FV19MSU5FKSB7XG4gICAgICAgICAgZm91bmRDb3VudCsrO1xuICAgICAgICAgIGlmIChmb3VuZENvdW50ID09PSAyKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY3VycmVudENoYXIgIT09IENIQVJTLkNBUlJJQUdFX1JFVFVSTikge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGlmIHRoZSBsYXN0IGNoYXIgd3JpdHRlbiB3YXMgYSBzcGFjZS5cbiAgICovXG4gIGlzTGFzdFNwYWNlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmdldExhc3RDaGFyKCkgPT09IFwiIFwiO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgaWYgdGhlIGxhc3QgY2hhciB3cml0dGVuIHdhcyBhIHRhYi5cbiAgICovXG4gIGlzTGFzdFRhYigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5nZXRMYXN0Q2hhcigpID09PSBcIlxcdFwiO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGxhc3QgY2hhciB3cml0dGVuLlxuICAgKi9cbiAgZ2V0TGFzdENoYXIoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBjaGFyQ29kZSA9IHRoaXMuX2dldExhc3RDaGFyQ29kZVdpdGhPZmZzZXQoMCk7XG4gICAgcmV0dXJuIGNoYXJDb2RlID09IG51bGwgPyB1bmRlZmluZWQgOiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoYXJDb2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGlmIHRoZSB3cml0ZXIgZW5kcyB3aXRoIHRoZSBwcm92aWRlZCB0ZXh0LlxuICAgKiBAcGFyYW0gdGV4dCAtIFRleHQgdG8gY2hlY2sgaWYgdGhlIHdyaXRlciBlbmRzIHdpdGggdGhlIHByb3ZpZGVkIHRleHQuXG4gICAqL1xuICBlbmRzV2l0aCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBsZW5ndGggPSB0aGlzLl9sZW5ndGg7XG4gICAgcmV0dXJuIHRoaXMuaXRlcmF0ZUxhc3RDaGFyQ29kZXMoKGNoYXJDb2RlLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3Qgb2Zmc2V0ID0gbGVuZ3RoIC0gaW5kZXg7XG4gICAgICBjb25zdCB0ZXh0SW5kZXggPSB0ZXh0Lmxlbmd0aCAtIG9mZnNldDtcbiAgICAgIGlmICh0ZXh0LmNoYXJDb2RlQXQodGV4dEluZGV4KSAhPT0gY2hhckNvZGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRleHRJbmRleCA9PT0gMCA/IHRydWUgOiB1bmRlZmluZWQ7XG4gICAgfSkgfHwgZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgb3ZlciB0aGUgd3JpdGVyIGNoYXJhY3RlcnMgaW4gcmV2ZXJzZSBvcmRlci4gVGhlIGl0ZXJhdGlvbiBzdG9wcyB3aGVuIGEgbm9uLW51bGwgb3JcbiAgICogdW5kZWZpbmVkIHZhbHVlIGlzIHJldHVybmVkIGZyb20gdGhlIGFjdGlvbi4gVGhlIHJldHVybmVkIHZhbHVlIGlzIHRoZW4gcmV0dXJuZWQgYnkgdGhlIG1ldGhvZC5cbiAgICpcbiAgICogQHJlbWFya3MgSXQgaXMgbXVjaCBtb3JlIGVmZmljaWVudCB0byB1c2UgdGhpcyBtZXRob2QgcmF0aGVyIHRoYW4gYCN0b1N0cmluZygpYCBzaW5jZSBgI3RvU3RyaW5nKClgXG4gICAqIHdpbGwgY29tYmluZSB0aGUgaW50ZXJuYWwgYXJyYXkgaW50byBhIHN0cmluZy5cbiAgICovXG4gIGl0ZXJhdGVMYXN0Q2hhcnM8VD4oYWN0aW9uOiAoY2hhcjogc3RyaW5nLCBpbmRleDogbnVtYmVyKSA9PiBUIHwgdW5kZWZpbmVkKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuaXRlcmF0ZUxhc3RDaGFyQ29kZXMoKGNoYXJDb2RlLCBpbmRleCkgPT4gYWN0aW9uKFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhckNvZGUpLCBpbmRleCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGVzIG92ZXIgdGhlIHdyaXRlciBjaGFyYWN0ZXIgY2hhciBjb2RlcyBpbiByZXZlcnNlIG9yZGVyLiBUaGUgaXRlcmF0aW9uIHN0b3BzIHdoZW4gYSBub24tbnVsbCBvclxuICAgKiB1bmRlZmluZWQgdmFsdWUgaXMgcmV0dXJuZWQgZnJvbSB0aGUgYWN0aW9uLiBUaGUgcmV0dXJuZWQgdmFsdWUgaXMgdGhlbiByZXR1cm5lZCBieSB0aGUgbWV0aG9kLlxuICAgKlxuICAgKiBAcmVtYXJrcyBJdCBpcyBtdWNoIG1vcmUgZWZmaWNpZW50IHRvIHVzZSB0aGlzIG1ldGhvZCByYXRoZXIgdGhhbiBgI3RvU3RyaW5nKClgIHNpbmNlIGAjdG9TdHJpbmcoKWBcbiAgICogd2lsbCBjb21iaW5lIHRoZSBpbnRlcm5hbCBhcnJheSBpbnRvIGEgc3RyaW5nLiBBZGRpdGlvbmFsbHksIHRoaXMgaXMgc2xpZ2h0bHkgbW9yZSBlZmZpY2llbnQgdGhhdFxuICAgKiBgaXRlcmF0ZUxhc3RDaGFyc2AgYXMgdGhpcyB3b24ndCBhbGxvY2F0ZSBhIHN0cmluZyBwZXIgY2hhcmFjdGVyLlxuICAgKi9cbiAgaXRlcmF0ZUxhc3RDaGFyQ29kZXM8VD4oYWN0aW9uOiAoY2hhckNvZGU6IG51bWJlciwgaW5kZXg6IG51bWJlcikgPT4gVCB8IHVuZGVmaW5lZCk6IFQgfCB1bmRlZmluZWQge1xuICAgIGxldCBpbmRleCA9IHRoaXMuX2xlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gdGhpcy5fdGV4dHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gdGhpcy5fdGV4dHNbaV07XG4gICAgICBmb3IgKGxldCBqID0gY3VycmVudFRleHQubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgaW5kZXgtLTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYWN0aW9uKGN1cnJlbnRUZXh0LmNoYXJDb2RlQXQoaiksIGluZGV4KTtcbiAgICAgICAgaWYgKHJlc3VsdCAhPSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHdyaXRlcidzIHRleHQuXG4gICAqL1xuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLl90ZXh0cy5sZW5ndGggPiAxKSB7XG4gICAgICBjb25zdCB0ZXh0ID0gdGhpcy5fdGV4dHMuam9pbihcIlwiKTtcbiAgICAgIHRoaXMuX3RleHRzLmxlbmd0aCA9IDA7XG4gICAgICB0aGlzLl90ZXh0cy5wdXNoKHRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl90ZXh0c1swXSB8fCBcIlwiO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBfbmV3TGluZVJlZ0V4ID0gL1xccj9cXG4vO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX3dyaXRlSW5kZW50aW5nTmV3TGluZXModGV4dDogc3RyaW5nKSB7XG4gICAgdGV4dCA9IHRleHQgfHwgXCJcIjtcbiAgICBpZiAodGV4dC5sZW5ndGggPT09IDApIHtcbiAgICAgIHdyaXRlSW5kaXZpZHVhbCh0aGlzLCBcIlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBpdGVtcyA9IHRleHQuc3BsaXQoQ29kZUJsb2NrV3JpdGVyLl9uZXdMaW5lUmVnRXgpO1xuICAgIGl0ZW1zLmZvckVhY2goKHMsIGkpID0+IHtcbiAgICAgIGlmIChpID4gMCkge1xuICAgICAgICB0aGlzLl9iYXNlV3JpdGVOZXdsaW5lKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHdyaXRlSW5kaXZpZHVhbCh0aGlzLCBzKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHdyaXRlSW5kaXZpZHVhbCh3cml0ZXI6IENvZGVCbG9ja1dyaXRlciwgczogc3RyaW5nKSB7XG4gICAgICBpZiAoIXdyaXRlci5pc0luU3RyaW5nKCkpIHtcbiAgICAgICAgY29uc3QgaXNBdFN0YXJ0T2ZMaW5lID0gd3JpdGVyLmlzTGFzdE5ld0xpbmUoKSB8fCB3cml0ZXIuZ2V0TGFzdENoYXIoKSA9PSBudWxsO1xuICAgICAgICBpZiAoaXNBdFN0YXJ0T2ZMaW5lKSB7XG4gICAgICAgICAgd3JpdGVyLl93cml0ZUluZGVudGF0aW9uKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgd3JpdGVyLl91cGRhdGVJbnRlcm5hbFN0YXRlKHMpO1xuICAgICAgd3JpdGVyLl9pbnRlcm5hbFdyaXRlKHMpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfYmFzZVdyaXRlTmV3bGluZSgpIHtcbiAgICBpZiAodGhpcy5fY3VycmVudENvbW1lbnRDaGFyID09PSBDb21tZW50Q2hhci5MaW5lKSB7XG4gICAgICB0aGlzLl9jdXJyZW50Q29tbWVudENoYXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgbGFzdFN0cmluZ0NoYXJPblN0YWNrID0gdGhpcy5fc3RyaW5nQ2hhclN0YWNrW3RoaXMuX3N0cmluZ0NoYXJTdGFjay5sZW5ndGggLSAxXTtcbiAgICBpZiAoKGxhc3RTdHJpbmdDaGFyT25TdGFjayA9PT0gQ0hBUlMuRE9VQkxFX1FVT1RFIHx8IGxhc3RTdHJpbmdDaGFyT25TdGFjayA9PT0gQ0hBUlMuU0lOR0xFX1FVT1RFKSAmJiB0aGlzLl9nZXRMYXN0Q2hhckNvZGVXaXRoT2Zmc2V0KDApICE9PSBDSEFSUy5CQUNLX1NMQVNIKSB7XG4gICAgICB0aGlzLl9zdHJpbmdDaGFyU3RhY2sucG9wKCk7XG4gICAgfVxuXG4gICAgdGhpcy5faW50ZXJuYWxXcml0ZSh0aGlzLl9uZXdMaW5lKTtcbiAgICB0aGlzLl9pc09uRmlyc3RMaW5lT2ZCbG9jayA9IGZhbHNlO1xuICAgIHRoaXMuX2RlcXVldWVRdWV1ZWRJbmRlbnRhdGlvbigpO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9kZXF1ZXVlUXVldWVkSW5kZW50YXRpb24oKSB7XG4gICAgaWYgKHRoaXMuX3F1ZXVlZEluZGVudGF0aW9uID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcXVldWVkT25seUlmTm90QmxvY2sgJiYgd2FzTGFzdEJsb2NrKHRoaXMpKSB7XG4gICAgICB0aGlzLl9xdWV1ZWRJbmRlbnRhdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuX3F1ZXVlZE9ubHlJZk5vdEJsb2NrID0gdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9jdXJyZW50SW5kZW50YXRpb24gPSB0aGlzLl9xdWV1ZWRJbmRlbnRhdGlvbjtcbiAgICAgIHRoaXMuX3F1ZXVlZEluZGVudGF0aW9uID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdhc0xhc3RCbG9jayh3cml0ZXI6IENvZGVCbG9ja1dyaXRlcikge1xuICAgICAgbGV0IGZvdW5kTmV3TGluZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIHdyaXRlci5pdGVyYXRlTGFzdENoYXJDb2RlcyhjaGFyQ29kZSA9PiB7XG4gICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICBjYXNlIENIQVJTLk5FV19MSU5FOlxuICAgICAgICAgICAgaWYgKGZvdW5kTmV3TGluZSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3VuZE5ld0xpbmUgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBDSEFSUy5DQVJSSUFHRV9SRVRVUk46XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgIGNhc2UgQ0hBUlMuT1BFTl9CUkFDRTpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfdXBkYXRlSW50ZXJuYWxTdGF0ZShzdHI6IHN0cmluZykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjdXJyZW50Q2hhciA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuXG4gICAgICAvLyBUaGlzIGlzIGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uIHRvIHNob3J0IGNpcmN1aXQgYWxsIHRoZSBjaGVja3MgYmVsb3cuIElmIHRoZSBjdXJyZW50IGNoYXJcbiAgICAgIC8vIGlzIG5vdCBpbiB0aGlzIHNldCB0aGVuIGl0IHdvbid0IGNoYW5nZSBhbnkgaW50ZXJuYWwgc3RhdGUgc28gbm8gbmVlZCB0byBjb250aW51ZSBhbmQgZG9cbiAgICAgIC8vIHNvIG1hbnkgb3RoZXIgY2hlY2tzICh0aGlzIG1hZGUgaXQgM3ggZmFzdGVyIGluIG9uZSBzY2VuYXJpbyBJIHRlc3RlZCkuXG4gICAgICBpZiAoIWlzQ2hhclRvSGFuZGxlLmhhcyhjdXJyZW50Q2hhcikpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBhc3RDaGFyID0gaSA9PT0gMCA/IHRoaXMuX2dldExhc3RDaGFyQ29kZVdpdGhPZmZzZXQoMCkgOiBzdHIuY2hhckNvZGVBdChpIC0gMSk7XG4gICAgICBjb25zdCBwYXN0UGFzdENoYXIgPSBpID09PSAwID8gdGhpcy5fZ2V0TGFzdENoYXJDb2RlV2l0aE9mZnNldCgxKSA6IGkgPT09IDEgPyB0aGlzLl9nZXRMYXN0Q2hhckNvZGVXaXRoT2Zmc2V0KDApIDogc3RyLmNoYXJDb2RlQXQoaSAtIDIpO1xuXG4gICAgICAvLyBoYW5kbGUgcmVnZXhcbiAgICAgIGlmICh0aGlzLl9pc0luUmVnRXgpIHtcbiAgICAgICAgaWYgKHBhc3RDaGFyID09PSBDSEFSUy5GT1JXQVJEX1NMQVNIICYmIHBhc3RQYXN0Q2hhciAhPT0gQ0hBUlMuQkFDS19TTEFTSCB8fCBwYXN0Q2hhciA9PT0gQ0hBUlMuTkVXX0xJTkUpIHtcbiAgICAgICAgICB0aGlzLl9pc0luUmVnRXggPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICghdGhpcy5pc0luU3RyaW5nKCkgJiYgIXRoaXMuaXNJbkNvbW1lbnQoKSAmJiBpc1JlZ0V4U3RhcnQoY3VycmVudENoYXIsIHBhc3RDaGFyLCBwYXN0UGFzdENoYXIpKSB7XG4gICAgICAgIHRoaXMuX2lzSW5SZWdFeCA9IHRydWU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBoYW5kbGUgY29tbWVudHNcbiAgICAgIGlmICh0aGlzLl9jdXJyZW50Q29tbWVudENoYXIgPT0gbnVsbCAmJiBwYXN0Q2hhciA9PT0gQ0hBUlMuRk9SV0FSRF9TTEFTSCAmJiBjdXJyZW50Q2hhciA9PT0gQ0hBUlMuRk9SV0FSRF9TTEFTSCkge1xuICAgICAgICB0aGlzLl9jdXJyZW50Q29tbWVudENoYXIgPSBDb21tZW50Q2hhci5MaW5lO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJyZW50Q29tbWVudENoYXIgPT0gbnVsbCAmJiBwYXN0Q2hhciA9PT0gQ0hBUlMuRk9SV0FSRF9TTEFTSCAmJiBjdXJyZW50Q2hhciA9PT0gQ0hBUlMuQVNURVJJU0spIHtcbiAgICAgICAgdGhpcy5fY3VycmVudENvbW1lbnRDaGFyID0gQ29tbWVudENoYXIuU3RhcjtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fY3VycmVudENvbW1lbnRDaGFyID09PSBDb21tZW50Q2hhci5TdGFyICYmIHBhc3RDaGFyID09PSBDSEFSUy5BU1RFUklTSyAmJiBjdXJyZW50Q2hhciA9PT0gQ0hBUlMuRk9SV0FSRF9TTEFTSCkge1xuICAgICAgICB0aGlzLl9jdXJyZW50Q29tbWVudENoYXIgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmlzSW5Db21tZW50KCkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIGhhbmRsZSBzdHJpbmdzXG4gICAgICBjb25zdCBsYXN0U3RyaW5nQ2hhck9uU3RhY2sgPSB0aGlzLl9zdHJpbmdDaGFyU3RhY2subGVuZ3RoID09PSAwID8gdW5kZWZpbmVkIDogdGhpcy5fc3RyaW5nQ2hhclN0YWNrW3RoaXMuX3N0cmluZ0NoYXJTdGFjay5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChwYXN0Q2hhciAhPT0gQ0hBUlMuQkFDS19TTEFTSCAmJiAoY3VycmVudENoYXIgPT09IENIQVJTLkRPVUJMRV9RVU9URSB8fCBjdXJyZW50Q2hhciA9PT0gQ0hBUlMuU0lOR0xFX1FVT1RFIHx8IGN1cnJlbnRDaGFyID09PSBDSEFSUy5CQUNLX1RJQ0spKSB7XG4gICAgICAgIGlmIChsYXN0U3RyaW5nQ2hhck9uU3RhY2sgPT09IGN1cnJlbnRDaGFyKSB7XG4gICAgICAgICAgdGhpcy5fc3RyaW5nQ2hhclN0YWNrLnBvcCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGxhc3RTdHJpbmdDaGFyT25TdGFjayA9PT0gQ0hBUlMuT1BFTl9CUkFDRSB8fCBsYXN0U3RyaW5nQ2hhck9uU3RhY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRoaXMuX3N0cmluZ0NoYXJTdGFjay5wdXNoKGN1cnJlbnRDaGFyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChwYXN0UGFzdENoYXIgIT09IENIQVJTLkJBQ0tfU0xBU0ggJiYgcGFzdENoYXIgPT09IENIQVJTLkRPTExBUl9TSUdOICYmIGN1cnJlbnRDaGFyID09PSBDSEFSUy5PUEVOX0JSQUNFICYmIGxhc3RTdHJpbmdDaGFyT25TdGFjayA9PT0gQ0hBUlMuQkFDS19USUNLKSB7XG4gICAgICAgIHRoaXMuX3N0cmluZ0NoYXJTdGFjay5wdXNoKGN1cnJlbnRDaGFyKTtcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudENoYXIgPT09IENIQVJTLkNMT1NFX0JSQUNFICYmIGxhc3RTdHJpbmdDaGFyT25TdGFjayA9PT0gQ0hBUlMuT1BFTl9CUkFDRSkge1xuICAgICAgICB0aGlzLl9zdHJpbmdDaGFyU3RhY2sucG9wKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAtIFRoaXMgaXMgcHJpdmF0ZSwgYnV0IGV4cG9zZWQgZm9yIHRlc3RpbmcuICovXG4gIF9nZXRMYXN0Q2hhckNvZGVXaXRoT2Zmc2V0KG9mZnNldDogbnVtYmVyKSB7XG4gICAgaWYgKG9mZnNldCA+PSB0aGlzLl9sZW5ndGggfHwgb2Zmc2V0IDwgMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gdGhpcy5fdGV4dHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gdGhpcy5fdGV4dHNbaV07XG4gICAgICBpZiAob2Zmc2V0ID49IGN1cnJlbnRUZXh0Lmxlbmd0aCkge1xuICAgICAgICBvZmZzZXQgLT0gY3VycmVudFRleHQubGVuZ3RoO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRUZXh0LmNoYXJDb2RlQXQoY3VycmVudFRleHQubGVuZ3RoIC0gMSAtIG9mZnNldCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX3dyaXRlSW5kZW50YXRpb24oKSB7XG4gICAgY29uc3QgZmxvb3JlZEluZGVudGF0aW9uID0gTWF0aC5mbG9vcih0aGlzLl9jdXJyZW50SW5kZW50YXRpb24pO1xuICAgIHRoaXMuX2ludGVybmFsV3JpdGUodGhpcy5faW5kZW50YXRpb25UZXh0LnJlcGVhdChmbG9vcmVkSW5kZW50YXRpb24pKTtcblxuICAgIGNvbnN0IG92ZXJmbG93ID0gdGhpcy5fY3VycmVudEluZGVudGF0aW9uIC0gZmxvb3JlZEluZGVudGF0aW9uO1xuICAgIGlmICh0aGlzLl91c2VUYWJzKSB7XG4gICAgICBpZiAob3ZlcmZsb3cgPiAwLjUpIHtcbiAgICAgICAgdGhpcy5faW50ZXJuYWxXcml0ZSh0aGlzLl9pbmRlbnRhdGlvblRleHQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBwb3J0aW9uID0gTWF0aC5yb3VuZCh0aGlzLl9pbmRlbnRhdGlvblRleHQubGVuZ3RoICogb3ZlcmZsb3cpO1xuXG4gICAgICAvLyBidWlsZCB1cCB0aGUgc3RyaW5nIGZpcnN0LCB0aGVuIGFwcGVuZCBpdCBmb3IgcGVyZm9ybWFuY2UgcmVhc29uc1xuICAgICAgbGV0IHRleHQgPSBcIlwiO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3J0aW9uOyBpKyspIHtcbiAgICAgICAgdGV4dCArPSB0aGlzLl9pbmRlbnRhdGlvblRleHRbaV07XG4gICAgICB9XG4gICAgICB0aGlzLl9pbnRlcm5hbFdyaXRlKHRleHQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCkge1xuICAgIGlmICghdGhpcy5fbmV3TGluZU9uTmV4dFdyaXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX25ld0xpbmVPbk5leHRXcml0ZSA9IGZhbHNlO1xuICAgIHRoaXMubmV3TGluZSgpO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9pbnRlcm5hbFdyaXRlKHRleHQ6IHN0cmluZykge1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3RleHRzLnB1c2godGV4dCk7XG4gICAgdGhpcy5fbGVuZ3RoICs9IHRleHQubGVuZ3RoO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBfc3BhY2VzT3JUYWJzUmVnRXggPSAvXlsgXFx0XSokLztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9nZXRJbmRlbnRhdGlvbkxldmVsRnJvbUFyZyhjb3VudE9yVGV4dDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gICAgaWYgKHR5cGVvZiBjb3VudE9yVGV4dCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgaWYgKGNvdW50T3JUZXh0IDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQYXNzZWQgaW4gaW5kZW50YXRpb24gbGV2ZWwgc2hvdWxkIGJlIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byAwLlwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb3VudE9yVGV4dDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb3VudE9yVGV4dCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgaWYgKCFDb2RlQmxvY2tXcml0ZXIuX3NwYWNlc09yVGFic1JlZ0V4LnRlc3QoY291bnRPclRleHQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVkIHN0cmluZyBtdXN0IGJlIGVtcHR5IG9yIG9ubHkgY29udGFpbiBzcGFjZXMgb3IgdGFicy5cIik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgc3BhY2VzQ291bnQsIHRhYnNDb3VudCB9ID0gZ2V0U3BhY2VzQW5kVGFic0NvdW50KGNvdW50T3JUZXh0KTtcbiAgICAgIHJldHVybiB0YWJzQ291bnQgKyBzcGFjZXNDb3VudCAvIHRoaXMuX2luZGVudE51bWJlck9mU3BhY2VzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBcmd1bWVudCBwcm92aWRlZCBtdXN0IGJlIGEgc3RyaW5nIG9yIG51bWJlci5cIik7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9zZXRJbmRlbnRhdGlvblN0YXRlKHN0YXRlOiBJbmRlbnRhdGlvbkxldmVsU3RhdGUpIHtcbiAgICB0aGlzLl9jdXJyZW50SW5kZW50YXRpb24gPSBzdGF0ZS5jdXJyZW50O1xuICAgIHRoaXMuX3F1ZXVlZEluZGVudGF0aW9uID0gc3RhdGUucXVldWVkO1xuICAgIHRoaXMuX3F1ZXVlZE9ubHlJZk5vdEJsb2NrID0gc3RhdGUucXVldWVkT25seUlmTm90QmxvY2s7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2dldEluZGVudGF0aW9uU3RhdGUoKTogSW5kZW50YXRpb25MZXZlbFN0YXRlIHtcbiAgICByZXR1cm4ge1xuICAgICAgY3VycmVudDogdGhpcy5fY3VycmVudEluZGVudGF0aW9uLFxuICAgICAgcXVldWVkOiB0aGlzLl9xdWV1ZWRJbmRlbnRhdGlvbixcbiAgICAgIHF1ZXVlZE9ubHlJZk5vdEJsb2NrOiB0aGlzLl9xdWV1ZWRPbmx5SWZOb3RCbG9jayxcbiAgICB9O1xuICB9XG59XG5cbmludGVyZmFjZSBJbmRlbnRhdGlvbkxldmVsU3RhdGUge1xuICBjdXJyZW50OiBudW1iZXI7XG4gIHF1ZXVlZDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBxdWV1ZWRPbmx5SWZOb3RCbG9jazogdHJ1ZSB8IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gaXNSZWdFeFN0YXJ0KGN1cnJlbnRDaGFyOiBudW1iZXIsIHBhc3RDaGFyOiBudW1iZXIgfCB1bmRlZmluZWQsIHBhc3RQYXN0Q2hhcjogbnVtYmVyIHwgdW5kZWZpbmVkKSB7XG4gIHJldHVybiBwYXN0Q2hhciA9PT0gQ0hBUlMuRk9SV0FSRF9TTEFTSFxuICAgICYmIGN1cnJlbnRDaGFyICE9PSBDSEFSUy5GT1JXQVJEX1NMQVNIXG4gICAgJiYgY3VycmVudENoYXIgIT09IENIQVJTLkFTVEVSSVNLXG4gICAgJiYgcGFzdFBhc3RDaGFyICE9PSBDSEFSUy5BU1RFUklTS1xuICAgICYmIHBhc3RQYXN0Q2hhciAhPT0gQ0hBUlMuRk9SV0FSRF9TTEFTSDtcbn1cblxuZnVuY3Rpb24gZ2V0SW5kZW50YXRpb25UZXh0KHVzZVRhYnM6IGJvb2xlYW4sIG51bWJlclNwYWNlczogbnVtYmVyKSB7XG4gIGlmICh1c2VUYWJzKSB7XG4gICAgcmV0dXJuIFwiXFx0XCI7XG4gIH1cbiAgcmV0dXJuIEFycmF5KG51bWJlclNwYWNlcyArIDEpLmpvaW4oXCIgXCIpO1xufVxuXG5mdW5jdGlvbiBnZXRTcGFjZXNBbmRUYWJzQ291bnQoc3RyOiBzdHJpbmcpIHtcbiAgbGV0IHNwYWNlc0NvdW50ID0gMDtcbiAgbGV0IHRhYnNDb3VudCA9IDA7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjaGFyQ29kZSA9IHN0ci5jaGFyQ29kZUF0KGkpO1xuICAgIGlmIChjaGFyQ29kZSA9PT0gQ0hBUlMuU1BBQ0UpIHtcbiAgICAgIHNwYWNlc0NvdW50Kys7XG4gICAgfSBlbHNlIGlmIChjaGFyQ29kZSA9PT0gQ0hBUlMuVEFCKSB7XG4gICAgICB0YWJzQ291bnQrKztcbiAgICB9XG4gIH1cblxuICBy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