import os

with open('d:/bangosambadApp/Api/push_helper.php', 'r') as f:
    content = f.read()

target = """        $stmt->execute();
    } catch (Exception $e) {"""

replacement = """        $stmt->execute();

        $url = 'http://127.0.0.1:3000/api/trigger';
        $postData = [
            'room' => "user_{$receiver_id}",
            'type' => 'app_notification',
            'payload' => ['title' => $title, 'body' => $body, 'type' => $type]
        ];
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        curl_exec($ch);
        curl_close($ch);
    } catch (Exception $e) {"""

if target in content:
    with open('d:/bangosambadApp/Api/push_helper.php', 'w') as f:
        f.write(content.replace(target, replacement))
    print("Success")
else:
    print("Target not found")
