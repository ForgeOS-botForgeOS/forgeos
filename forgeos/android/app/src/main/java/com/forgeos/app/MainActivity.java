package com.forgeos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register native plugins before the bridge starts.
        registerPlugin(HealthConnectPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
