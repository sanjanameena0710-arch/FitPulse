# job: 0001-ro__hello-phone
# created: 2026-08-30 by Arena agent
# @timeout: 60
# @needs: termux-battery-status
# Read-only phone probe — koi bhi kuch change nahi karta.
echo "== phone =="
getprop ro.product.model
getprop ro.build.version.release
getprop ro.build.version.sdk
uptime
free -m
echo "== storage =="
df -h /data
echo "== termux:api =="
termux-battery-status
termux-wifi-connectioninfo
echo "== sensors =="
termux-sensor -l
