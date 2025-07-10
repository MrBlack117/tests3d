import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '../../navigation/AppNavigator';

const TestMenuScreen: React.FC = () => {
    const navigation = useNavigation();

    const testScreens = [
        { name: 'Cube Render', route: 'CubeRender' },
        { name: 'Cube Animation', route: 'CubeAnimation' },
        { name: 'Planet Texture', route: 'PlanetTexture' },
        { name: 'Planet Animation', route: 'PlanetAnimation' },
        { name: 'Model Test', 'route': 'ModelDisplay' },
        { name: 'Wave Test', 'route': 'WaveTest' },
        { name: 'Planet Data Management', route: 'PlanetDataManagement' }
    ];

    const handleNavigate = (route: string) => {
        navigation.navigate(route);
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
                <Text style={styles.appTitle}>Astro Balance</Text>
                <Text style={styles.headerText}>Test Menu</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle="dark-content"
            />
            <LinearGradient
                colors={['#F0F0F0', '#FFFFFF']}
                style={styles.container}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    {renderHeader()}
                    <View style={styles.buttonContainer}>
                        {testScreens.map((screen) => (
                            <TouchableOpacity
                                key={screen.route}
                                style={styles.testButton}
                                onPress={() => handleNavigate(screen.route)}
                            >
                                <LinearGradient
                                    colors={['#4A00E0', '#8E2DE2']}
                                    style={styles.testButtonGradient}
                                >
                                    <Text style={styles.testButtonText}>
                                        {screen.name}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <LinearGradient
                            colors={['rgba(74, 0, 224, 0.9)', 'rgba(142, 45, 226, 0.9)']}
                            style={styles.floatingButton}
                        >
                            <Icon name="arrow-left" size={22} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={styles.buttonLabel}>Back</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F0F0F0',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingTop: 50,
        paddingHorizontal: 8,
    },
    headerTitleContainer: {
        flexDirection: 'column',
    },
    appTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#8E2DE2',
        marginBottom: 4,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#666666',
    },
    buttonContainer: {
        paddingHorizontal: 16,
        flex: 1,
        justifyContent: 'center',
    },
    testButton: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    testButtonGradient: {
        padding: 14,
        alignItems: 'center',
    },
    testButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        bottom: 24,
        alignItems: 'center',
    },
    floatingButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    buttonLabel: {
        marginTop: 4,
        fontSize: 12,
        color: '#666666',
        fontWeight: '500',
    },
});

export default TestMenuScreen;