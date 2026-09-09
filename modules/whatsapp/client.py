import httpx

WHATSAPP_SERVICE_URL = "http://localhost:3000/send"


def send_whatsapp_message(to: str, message: str) -> dict:
    """
    Sends an HTTP POST request to the Baileys WhatsApp microservice to deliver a message.
    """
    try:
        response = httpx.post(
            WHATSAPP_SERVICE_URL,
            json={"to": to, "message": message},
            timeout=10.0
        )
        return response.json()
    except Exception as e:
        print(f"Error sending WhatsApp message to {to}: {e}")
        return {"error": str(e)}


async def async_send_whatsapp_message(to: str, message: str) -> dict:
    """Async variant of send_whatsapp_message."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                WHATSAPP_SERVICE_URL,
                json={"to": to, "message": message}
            )
            return response.json()
    except Exception as e:
        print(f"Error sending async WhatsApp message to {to}: {e}")
        return {"error": str(e)}
