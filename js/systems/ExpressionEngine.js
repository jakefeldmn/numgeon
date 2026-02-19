import { OPERATORS } from '../data/operators.js';

// Token types:
//   { type: 'number', value: 5 }
//   { type: 'operator', id: 'add' }
//   { type: 'operator', id: 'lparen' }  — left parenthesis
//   { type: 'operator', id: 'rparen' }  — right parenthesis

function isParen(token, side) {
  if (token.type !== 'operator') return false;
  const op = OPERATORS[token.id];
  return op && op.paren === side;
}

export function validateExpression(tokens) {
  if (tokens.length === 0) return { valid: false, error: 'Expression is empty' };

  let expectNumber = true;
  let parenDepth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'number') {
      if (!expectNumber) {
        return { valid: false, error: `Unexpected number at position ${i + 1}` };
      }
      expectNumber = false;

    } else if (isParen(token, 'left')) {
      // ( acts like we're expecting a number — it opens a group
      if (!expectNumber) {
        return { valid: false, error: `Unexpected ( at position ${i + 1}` };
      }
      parenDepth++;
      // Still expecting a number after (

    } else if (isParen(token, 'right')) {
      // ) acts like after a number — it closes a group
      if (expectNumber) {
        return { valid: false, error: `Unexpected ) at position ${i + 1}` };
      }
      parenDepth--;
      if (parenDepth < 0) {
        return { valid: false, error: `Unmatched ) at position ${i + 1}` };
      }
      // After ), we expect an operator (not a number)

    } else if (token.type === 'operator') {
      const op = OPERATORS[token.id];
      if (!op) return { valid: false, error: `Unknown operator: ${token.id}` };

      if (op.arity === 1 && op.position === 'prefix') {
        if (!expectNumber) {
          return { valid: false, error: `Unexpected prefix operator ${op.symbol} at position ${i + 1}` };
        }
        // Still expecting a number after prefix op
      } else if (op.arity === 1 && op.position === 'postfix') {
        if (expectNumber) {
          return { valid: false, error: `Unexpected postfix operator ${op.symbol} at position ${i + 1}` };
        }
        // After postfix, still expect an operator
      } else {
        // Binary operator — must follow a number or )
        if (expectNumber) {
          return { valid: false, error: `Unexpected operator ${op.symbol} at position ${i + 1}` };
        }
        expectNumber = true;
      }
    }
  }

  if (expectNumber) {
    return { valid: false, error: 'Expression ends with an operator' };
  }

  if (parenDepth !== 0) {
    return { valid: false, error: `Unmatched ( — missing ${parenDepth} closing parenthesis${parenDepth > 1 ? 'es' : ''}` };
  }

  return { valid: true, error: null };
}

// Shunting-yard algorithm: convert infix tokens to postfix (RPN)
export function toPostfix(tokens) {
  const output = [];
  const opStack = [];

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token);

    } else if (isParen(token, 'left')) {
      opStack.push(token);

    } else if (isParen(token, 'right')) {
      // Pop operators until we hit the matching (
      while (opStack.length > 0 && !isParen(opStack[opStack.length - 1], 'left')) {
        output.push(opStack.pop());
      }
      // Pop the ( itself (discard it)
      if (opStack.length > 0) {
        opStack.pop();
      }

    } else if (token.type === 'operator') {
      const op = OPERATORS[token.id];

      if (op.arity === 1 && op.position === 'prefix') {
        opStack.push(token);
      } else if (op.arity === 1 && op.position === 'postfix') {
        output.push(token);
      } else {
        // Binary operator
        while (opStack.length > 0) {
          const topToken = opStack[opStack.length - 1];
          // Stop at left paren
          if (isParen(topToken, 'left')) break;

          const topOp = OPERATORS[topToken.id];
          if (topOp.precedence > op.precedence ||
              (topOp.precedence === op.precedence && token.id !== 'power')) {
            output.push(opStack.pop());
          } else {
            break;
          }
        }
        opStack.push(token);
      }
    }
  }

  // Pop remaining operators
  while (opStack.length > 0) {
    const top = opStack.pop();
    // Leftover parens should not end up in output (already caught by validator)
    if (!isParen(top, 'left')) {
      output.push(top);
    }
  }

  return output;
}

// Evaluate a postfix (RPN) token array
export function evaluatePostfix(postfix) {
  const stack = [];

  for (const token of postfix) {
    if (token.type === 'number') {
      stack.push(token.value);
    } else if (token.type === 'operator') {
      const op = OPERATORS[token.id];

      if (op.arity === 1) {
        if (stack.length < 1) return { result: NaN, error: 'Not enough operands' };
        const a = stack.pop();
        const result = op.fn(a);
        if (isNaN(result) || !isFinite(result)) {
          return { result: NaN, error: `Invalid operation: ${op.symbol}(${a})` };
        }
        stack.push(result);
      } else {
        if (stack.length < 2) return { result: NaN, error: 'Not enough operands' };
        const b = stack.pop();
        const a = stack.pop();
        const result = op.fn(a, b);
        if (isNaN(result) || !isFinite(result)) {
          return { result: NaN, error: `Invalid operation: ${a} ${op.symbol} ${b}` };
        }
        stack.push(result);
      }
    }
  }

  if (stack.length !== 1) {
    return { result: NaN, error: 'Invalid expression structure' };
  }

  return { result: stack[0], error: null };
}

// Main entry point: validate, parse, evaluate
export function evaluate(tokens) {
  const validation = validateExpression(tokens);
  if (!validation.valid) {
    return { result: NaN, valid: false, error: validation.error };
  }

  const postfix = toPostfix(tokens);
  const { result, error } = evaluatePostfix(postfix);

  if (error) {
    return { result: NaN, valid: false, error };
  }

  return {
    result: Math.round(result * 1000) / 1000,
    valid: true,
    error: null,
    diceUsed: tokens.filter(t => t.type === 'number').length,
    operatorsUsed: tokens.filter(t => t.type === 'operator').length,
  };
}

// Build a display string from tokens
export function tokensToString(tokens) {
  return tokens.map(t => {
    if (t.type === 'number') return String(t.value);
    const op = OPERATORS[t.id];
    return op?.symbol || '?';
  }).join(' ');
}
