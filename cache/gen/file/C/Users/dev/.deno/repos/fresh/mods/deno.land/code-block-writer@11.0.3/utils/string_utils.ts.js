const newlineRegex = /(\r?\n)/g;
/** @internal */ export function escapeForWithinString(str, quoteKind) {
    return escapeChar(str, quoteKind).replace(newlineRegex, "\\$1");
}
/** @internal */ export function escapeChar(str, char) {
    if (char.length !== 1) {
        throw new Error(`Specified char must be one character long.`);
    }
    let result = "";
    for(let i = 0; i < str.length; i++){
        if (str[i] === char) {
            result += "\\";
        }
        result += str[i];
    }
    return result;
}
/** @internal */ export function getStringFromStrOrFunc(strOrFunc) {
    return strOrFunc instanceof Function ? strOrFunc() : strOrFunc;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL2NvZGUtYmxvY2std3JpdGVyQDExLjAuMy91dGlscy9zdHJpbmdfdXRpbHMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgbmV3bGluZVJlZ2V4ID0gLyhcXHI/XFxuKS9nO1xuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlRm9yV2l0aGluU3RyaW5nKHN0cjogc3RyaW5nLCBxdW90ZUtpbmQ6IHN0cmluZykge1xuICByZXR1cm4gZXNjYXBlQ2hhcihzdHIsIHF1b3RlS2luZCkucmVwbGFjZShuZXdsaW5lUmVnZXgsIFwiXFxcXCQxXCIpO1xufVxuXG4vKiogQGludGVybmFsICovXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlQ2hhcihzdHI6IHN0cmluZywgY2hhcjogc3RyaW5nKSB7XG4gIGlmIChjaGFyLmxlbmd0aCAhPT0gMSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU3BlY2lmaWVkIGNoYXIgbXVzdCBiZSBvbmUgY2hhcmFjdGVyIGxvbmcuYCk7XG4gIH1cblxuICBsZXQgcmVzdWx0ID0gXCJcIjtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3RyW2ldID09PSBjaGFyKSB7XG4gICAgICByZXN1bHQgKz0gXCJcXFxcXCI7XG4gICAgfVxuICAgIHJlc3VsdCArPSBzdHJbaV07XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN0cmluZ0Zyb21TdHJPckZ1bmMoc3RyT3JGdW5jOiBzdHJpbmcgfCAoKCkgPT4gc3RyaW5nKSkge1xuICByZXR1cm4gc3RyT3JGdW5jIGluc3RhbmNlb2YgRnVuY3Rpb24gPyBzdHJPckZ1bmMoKSA6IHN0ck9yRnVuYztcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLGVBQWU7QUFFckIsY0FBYyxHQUNkLE9BQU8sU0FBUyxzQkFBc0IsR0FBVyxFQUFFLFNBQWlCLEVBQUU7SUFDcEUsT0FBTyxXQUFXLEtBQUssV0FBVyxPQUFPLENBQUMsY0FBYztBQUMxRCxDQUFDO0FBRUQsY0FBYyxHQUNkLE9BQU8sU0FBUyxXQUFXLEdBQVcsRUFBRSxJQUFZLEVBQUU7SUFDcEQsSUFBSSxLQUFLLE1BQU0sS0FBSyxHQUFHO1FBQ3JCLE1BQU0sSUFBSSxNQUFNLENBQUMsMENBQTBDLENBQUMsRUFBRTtJQUNoRSxDQUFDO0lBRUQsSUFBSSxTQUFTO0lBQ2IsSUFBSyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksTUFBTSxFQUFFLElBQUs7UUFDbkMsSUFBSSxHQUFHLENBQUMsRUFBRSxLQUFLLE1BQU07WUFDbkIsVUFBVTtRQUNaLENBQUM7UUFDRCxVQUFVLEdBQUcsQ0FBQyxFQUFFO0lBQ2xCO0lBQ0EsT0FBTztBQUNULENBQUM7QUFFRCxjQUFjLEdBQ2QsT0FBTyxTQUFTLHVCQUF1QixTQUFrQyxFQUFFO0lBQ3pFLE9BQU8scUJBQXFCLFdBQVcsY0FBYyxTQUFTO0FBQ2hFLENBQUMifQ==