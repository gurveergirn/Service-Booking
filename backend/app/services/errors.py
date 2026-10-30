from fastapi import HTTPException, status


def not_found(what: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


def conflict(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, detail)


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, detail)


def forbidden(detail: str = "You don't have access to this resource") -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, detail)
