const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('https://www.sadhuvandna.co.in/Api/like_comment_action.php', {
            action: 'report',
            id: 913,
            user_id: 1,
            reason: 'Handsome boy'
        });
        console.log("RESPONSE:", res.data);
    } catch(e) {
        console.error("ERROR:", e.message);
        if (e.response) {
            console.error("STATUS:", e.response.status);
            console.error("DATA:", e.response.data);
        }
    }
}
test();
