var _foo;
var k = Symbol();
var foo = (_foo = {}, babelHelpers.defineProperty(_foo, Symbol.iterator, "foobar"), babelHelpers.defineAccessor("get", _foo, k, function () {
  return k;
}), _foo);
