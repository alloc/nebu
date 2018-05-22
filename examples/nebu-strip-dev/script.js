
if (process.env.NODE_ENV !== 'production') {
  throw Error('wtf');
} else {
  require('./production-only');

  if (process.env.NODE_ENV !== 'production') {
    // This block *should* be removed, but isn't.
  }
}

// Works with != or !== operators.
if (process.env.NODE_ENV != 'production') {
  throw Error('wtf');
} else if (true) {
  // This line will always be reached.
}

if (true) {
  // This line will always be reached.
} else if (process.env.NODE_ENV !== 'production') {
  throw Error('wtf');
} else {
  // This block should *not* be removed, but is.
}

if (true && process.env.NODE_ENV !== 'production') {
  console.warn('true && NODE_ENV');
} else {
  // This line will always be reached.
}

if (process.env.NODE_ENV !== 'production' && true) {
  console.warn('NODE_ENV && true');
} else {
  // This line will always be reached.
}

if (true && process.env.NODE_ENV !== 'production' && true) {
  console.warn('true && NODE_ENV && true');
} else {
  // This line will always be reached.
}

if ((false || process.env.NODE_ENV !== 'production') && true) {
  console.warn('(false || NODE_ENV) && true');
} else {
  // This line will always be reached.
}

if (false || (process.env.NODE_ENV !== 'production' && true)) {
  console.warn('false || (NODE_ENV && true)');
} else {
  // This line will always be reached.
}

// Binding NODE_ENV is not supported (yet)
const dev = process.env.NODE_ENV !== 'production';
if (dev) {
  console.warn('Bindings not supported');
}
