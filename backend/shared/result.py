from dataclasses import dataclass
from typing import Generic, Optional, TypeVar

T = TypeVar("T")


@dataclass
class Result(Generic[T]):
    value: Optional[T] = None
    error: Optional[str] = None

    @property
    def is_success(self) -> bool:
        return self.error is None

    @classmethod
    def ok(cls, value: T) -> "Result[T]":
        return cls(value=value)

    @classmethod
    def fail(cls, error: str) -> "Result[T]":
        return cls(error=error)

    def unwrap(self) -> T:
        if self.error is not None:
            raise ValueError(f"Result is an error: {self.error}")
        assert self.value is not None
        return self.value
