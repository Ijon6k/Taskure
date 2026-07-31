package handler

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func testContextWithTZ(offset string) *gin.Context {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/focus?tz_offset_minutes="+offset, nil)
	return c
}

func zoneOffset(loc *time.Location) int {
	_, off := time.Date(2000, 1, 1, 0, 0, 0, 0, loc).Zone()
	return off
}

func TestClientLocation(t *testing.T) {
	cases := []struct {
		name   string
		offset string
		want   int // seconds east of UTC
	}{
		{"valid positive", "420", 7 * 60 * 60},
		{"valid negative", "-300", -5 * 60 * 60},
		{"zero", "0", 0},
		{"missing", "", 0},
		{"malformed", "abc", 0},
		{"too large", "900", 0},
		{"too negative", "-900", 0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := clientLocation(testContextWithTZ(c.offset))
			if off := zoneOffset(got); off != c.want {
				t.Errorf("clientLocation(%q) offset = %d, want %d", c.offset, off, c.want)
			}
		})
	}
}
