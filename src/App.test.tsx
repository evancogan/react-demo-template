import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import App from './App';

test('renders the main heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', {level: 1})).toBeInTheDocument();
});

test('counter button increments count from 0 to 1', async () => {
  render(<App />);
  const btn = screen
    .getAllByRole('button')
    .find((b: Element | null) => b && b.textContent.includes('Count is 0'));
  if (!btn) throw new Error('counter button not found');
  expect(btn).toHaveTextContent('Count is 0');
  btn.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(btn.textContent).toContain('1');
});

test('counter button starts at 0 and shows 1 after clicking', async () => {
  render(<App />);
  const btn = screen
    .getAllByRole('button')
    .find((b: Element | null) => b && b.textContent.includes('Count is 0'));
  if (!btn) throw new Error('counter button not found');
  expect(btn).toHaveTextContent('Count is 0');
  btn.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(btn.textContent).toContain('1');
});

export default App;
