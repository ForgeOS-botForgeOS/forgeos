# Signing the over-the-air web bundle

Installed apps replace their own web code from `web.zip` on the `app-latest`
GitHub release. Android's APK signature protects APK updates, but not this path:
anyone who can write to that release (a stolen token, a compromised account)
could ship script to every phone. Pinning a public key in the APK closes that.

The pieces are already in the repo and stay dormant until you do this once:

1. Generate a key pair on your own machine (never commit the private key):

   ```
   openssl ecparam -name prime256v1 -genkey -noout -out ota-private.pem
   openssl ec -in ota-private.pem -pubout -outform DER | base64 -w0   # public key
   base64 -w0 ota-private.pem                                          # secret value
   ```

2. Add the second output as the repo secret `OTA_SIGNING_KEY_PEM_B64`
   (Settings, Secrets and variables, Actions). Keep `ota-private.pem` somewhere
   safe and offline, then delete the local copy you do not need.
3. Paste the first output into `OTA_PUBKEY_B64` in
   `android/app/src/main/java/com/forgeos/app/WebUpdatePlugin.kt`.
4. Push that change yourself (it touches `android/`) and install the new APK.
   CI then signs every `web.zip`; apps with the key refuse any bundle without a
   valid signature.

Order matters: secret first, APK second. An APK that pins a key refuses unsigned
bundles, so do not install it before a signed release exists. Losing the private
key means shipping a new APK with a new public key.
