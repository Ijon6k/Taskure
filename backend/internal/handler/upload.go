package handler

import (
	"bytes"
	"io"
	"net/http"
	"strings"
)

// prepareUpload peeks at the first bytes of an upload to refine the declared
// content type via sniffing, then returns a replayable reader for the whole
// body. It never spools the file: variant generation moved to the background
// worker, so the request path streams straight to object storage.
//
// Returns:
//   - reader: a reader that yields the full upload body (sniffed prefix +
//     the rest of the stream).
//   - contentType: the refined MIME type to store (sniffed when the declared
//     one was empty or generic).
func prepareUpload(r io.Reader, declared string) (io.Reader, string, error) {
	head := make([]byte, 512)
	n, err := io.ReadFull(r, head)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return nil, "", err
	}
	head = head[:n]

	contentType := strings.TrimSpace(declared)
	if contentType == "" || contentType == "application/octet-stream" {
		// Only refine generic/empty declarations via sniffing. A specific
		// declared type (e.g. image/svg+xml, application/pdf) is trusted as-is,
		// since DetectContentType does not recognize those formats.
		if sniffed := http.DetectContentType(head); sniffed != "" {
			contentType = sniffed
		}
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	return io.MultiReader(bytes.NewReader(head), r), contentType, nil
}
