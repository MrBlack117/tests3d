/**
 * A simple component that displays the current date in a formatted way.
 * Used in the solar system visualization to show the simulation date
 * as planets move along their orbits.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DateTimeDisplayProps {
    date: Date;
}

const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({ date }) => {
    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Text style={styles.text}>
                    {date.toLocaleDateString()}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingTop: 60,
        zIndex: 5,
    },
    container: {
        backgroundColor: 'rgba(10, 10, 40, 0.7)',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(140, 140, 255, 0.3)',
    },
    text: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});

export default DateTimeDisplay;