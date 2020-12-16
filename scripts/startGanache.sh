@echo off
echo Loading Resources . . .
cd ../node_modules/.bin/
echo starting ganache-cli  . . .
./ganache-cli --gasLimit 0xfffffffffff -i 5777 -k "constantinople" -p 8545 -m 'grocery obvious wire insane limit weather parade parrot patrol stock blast ivory' -a 47 -e 250 --gasPrice 0
ping 127.0.0.1 -n 5 > nul
