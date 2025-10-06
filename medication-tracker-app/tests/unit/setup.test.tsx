/**
 * Sample Unit Test
 * Verifies Jest and React Native Testing Library setup
 */

import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

describe('Test Framework Setup', () => {
  it('should render a simple component', () => {
    const TestComponent = () => (
      <View>
        <Text>Hello Testing</Text>
      </View>
    );

    const { getByText } = render(<TestComponent />);
    expect(getByText('Hello Testing')).toBeTruthy();
  });

  it('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('test').toContain('es');
    expect([1, 2, 3]).toHaveLength(3);
  });
});
