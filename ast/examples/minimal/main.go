package something

import (
	"net/http"
	"testing"
)

type Thing struct{}

func (thing Thing) Init() {}

func (thing Thing) Method(arg string) {
	val := a_function(arg)
	blah.Initialize()
}

func (thing Thing) Method2(arg string) {
	thing.Method("hi")
}

func a_function(a string) {
	return "return value " + a
}

func TestThing(t *testing.T) {
	thing := Thing{}
	ret := thing.Method("hi")
	if ret != "return value hi" {
		panic("bad return value")
	}
}

func NewRouter() *http.Server {
	r := chi.NewRouter()
	r.Mount("/tribes", TribeRoutes())
	r.Get("/podcast", handler.GetPodcast)
}

func TribeRoutes() chi.Router {
	r := chi.NewRouter()
	r.Group(func(r chi.Router) {
		r.Get("/listed", GetListedTribes)
	})
	return r
}
func GetPodcast(id uint) {
	db.db.Where("id = ?", 1).First(&id)
}
func CreatePodcast(pod Podcast) {
	db.db.Model(&pod).Create(&pod)
}
func GetListedTribes() {}

type Podcast struct {
	ID      uint   `json:"id"`
	OwnerID string `json:"owner_id"`
}
