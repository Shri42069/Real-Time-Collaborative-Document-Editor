import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
// StrictMode removed: react-quill v2 uses findDOMNode internally which
// triggers a deprecation warning in StrictMode. Remove once react-quill v3 is stable.
root.render(<App />);