const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('https://www.sadhuvandna.co.in/api/check_anchor_status.php?user_id=1765');
        console.log("ANCHOR STATUS:", res.data);
        
        const res2 = await axios.get('https://www.sadhuvandna.co.in/api/get_user_profile.php?user_id=1765');
        console.log("USER PROFILE KEYS:", Object.keys(res2.data.user || {}));
        console.log("USER PROFILE:", res2.data.user);
    } catch(e) {
        console.log(e.message);
    }
}
test();
