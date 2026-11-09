import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import App from './App';
import {fireEvent} from '@testing-library/react';

test('renders the main heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', {level: 1})).toBeInTheDocument();
});

test('counter goes up when clicked', () => {
  render(<App />);
  const buttons = screen.getAllByText(/Count is \d+$/m);
  const button = buttons[0];
  fireEvent.click(button);
  expect(screen.getByText(/Count is 1/)).toBeInTheDocument();
});
