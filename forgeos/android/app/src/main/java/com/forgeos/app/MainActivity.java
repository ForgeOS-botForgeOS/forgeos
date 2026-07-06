package com.forgeos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register native plugins before the bridge starts. WebUpdatePlugin's
        // load() also swaps in any previously downloaded web bundle (OTA update).
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(WebUpdatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
