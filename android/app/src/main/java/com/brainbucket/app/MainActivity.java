package com.brainbucket.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Make system bars NOT overlap the WebView
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}
