package com.forgeos.app;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Matches the app background (capacitor.config.ts backgroundColor) — the
    // themes ForgeOS ships are all dark, so the system bars must be too.
    private static final String APP_BACKGROUND = "#0b0e14";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register native plugins before the bridge starts. WebUpdatePlugin's
        // load() also swaps in any previously downloaded web bundle (OTA update).
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(WebUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        // The stock Capacitor theme leaves the navigation/status bars at their
        // light defaults, which shows as a white strip under the dark app.
        int background = Color.parseColor(APP_BACKGROUND);
        getWindow().setNavigationBarColor(background);
        getWindow().setStatusBarColor(background);
    }
}
